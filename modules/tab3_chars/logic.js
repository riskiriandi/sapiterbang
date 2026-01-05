import { AppState } from '../../core/state.js';
import { CharState } from './state.js';
import { generateCharImage, uploadToImgBB, analyzeAssetsAI } from './api.js';

export default function init() {
    const assetGrid = document.getElementById('asset-grid');
    const emptyState = document.getElementById('empty-assets');
    const btnAnalyze = document.getElementById('btn-analyze-assets');
    const btnAddManual = document.getElementById('btn-add-manual');
    const modelSelect = document.getElementById('model-select');
    const btnNext = document.getElementById('btn-next-tab');

    // 1. LOAD DATA
    const savedState = CharState.get();
    if (savedState.selectedModel) modelSelect.value = savedState.selectedModel;
    renderGrid();

    // 2. ANALYZE SCRIPT
    btnAnalyze.addEventListener('click', async () => {
        const script = AppState.story.finalScript;
        if (!script || script.length === 0) return alert("Buat Skenario di Tab 1 dulu!");

        if (CharState.get().assets.length > 0 && !confirm("Timpa daftar aset yang ada?")) return;

        btnAnalyze.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Analyzing...`;
        btnAnalyze.disabled = true;

        try {
            const result = await analyzeAssetsAI(script);
            
            // Convert ke format state
            const newAssets = result.assets.map((a, i) => ({
                id: Date.now() + i,
                name: a.name,
                type: a.type, // 'character' or 'prop'
                desc: a.desc,
                imgbbUrl: null,
                userPrompt: "" // Prompt manual user
            }));

            CharState.update({ assets: newAssets });
            renderGrid();

        } catch (e) {
            alert("Gagal: " + e.message);
        } finally {
            btnAnalyze.innerHTML = `<i class="ph ph-scan"></i> Analyze Script Requirements`;
            btnAnalyze.disabled = false;
        }
    });

    // 3. MANUAL ADD
    btnAddManual.addEventListener('click', () => {
        const newAsset = {
            id: Date.now(),
            name: "New Asset",
            type: "prop",
            desc: "Description...",
            imgbbUrl: null
        };
        const current = CharState.get().assets || [];
        current.push(newAsset);
        CharState.update({ assets: current });
        renderGrid();
    });

    // 4. RENDER ENGINE
    function renderGrid() {
        const assets = CharState.get().assets || [];
        assetGrid.innerHTML = "";

        if (assets.length === 0) {
            if(emptyState) emptyState.classList.remove('hidden');
            return;
        }
        if(emptyState) emptyState.classList.add('hidden');

        assets.forEach((asset, index) => {
            const isProp = asset.type === 'prop';
            const badgeColor = isProp ? 'bg-yellow-500/20 text-yellow-400' : 'bg-accent/20 text-accent';
            const icon = isProp ? 'ph-cube' : 'ph-user';

            const card = document.createElement('div');
            card.className = "glass-panel rounded-xl overflow-hidden flex flex-col border border-white/5";

            card.innerHTML = `
                <!-- HEADER -->
                <div class="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <input type="text" value="${asset.name}" class="bg-transparent font-bold text-white text-sm w-2/3 focus:outline-none" id="name-${asset.id}">
                    <span class="text-[10px] ${badgeColor} px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                        <i class="ph ${icon}"></i> ${asset.type}
                    </span>
                </div>

                <!-- PREVIEW -->
                <div class="aspect-square bg-black/50 relative group w-full flex items-center justify-center overflow-hidden">
                    ${asset.imgbbUrl 
                        ? `<img src="${asset.imgbbUrl}" class="w-full h-full object-cover cursor-pointer" onclick="window.open('${asset.imgbbUrl}')">`
                        : `<div class="text-center p-4 text-gray-600"><i class="ph ph-image text-3xl mb-1"></i><p class="text-[10px]">Empty</p></div>`
                    }
                    <div id="loading-${asset.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                        <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                    </div>
                </div>

                <!-- CONTROLS -->
                <div class="p-3 space-y-3 bg-black/20 flex-grow flex flex-col">
                    <textarea id="desc-${asset.id}" class="w-full bg-black/40 text-gray-300 text-[10px] p-2 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none custom-scrollbar">${asset.desc}</textarea>
                    
                    <!-- LINK DISPLAY -->
                    ${asset.imgbbUrl ? `
                    <div class="flex items-center gap-2 bg-black/40 p-1 rounded border border-green-500/30">
                        <i class="ph ph-link text-green-400 text-xs"></i>
                        <input type="text" value="${asset.imgbbUrl}" readonly class="bg-transparent text-[9px] text-gray-400 w-full focus:outline-none">
                    </div>` : ''}

                    <!-- DUAL BUTTONS -->
                    <div class="flex gap-2 mt-auto">
                        <button id="btn-upload-${asset.id}" class="flex-1 btn-pro bg-white/10 hover:bg-white/20 text-xs py-2 justify-center" title="Upload Manual Crop">
                            <i class="ph ph-upload"></i>
                        </button>
                        <button id="btn-gen-${asset.id}" class="flex-1 btn-pro btn-pro-primary text-xs py-2 justify-center" title="Generate AI">
                            <i class="ph ph-lightning"></i>
                        </button>
                    </div>
                    
                    <button class="text-red-500 text-[10px] w-full hover:text-white" onclick="deleteAsset(${index})">Hapus Aset</button>
                    
                    <input type="file" id="file-${asset.id}" class="hidden" accept="image/*">
                </div>
            `;

            assetGrid.appendChild(card);

            // LISTENERS
            const nameInput = document.getElementById(`name-${asset.id}`);
            const descInput = document.getElementById(`desc-${asset.id}`);
            const btnUpload = document.getElementById(`btn-upload-${asset.id}`);
            const btnGen = document.getElementById(`btn-gen-${asset.id}`);
            const fileInput = document.getElementById(`file-${asset.id}`);
            const loading = document.getElementById(`loading-${asset.id}`);

            // Auto Save Text
            [nameInput, descInput].forEach(inp => {
                inp.addEventListener('change', () => {
                    CharState.update({ 
                        assetUpdate: { id: asset.id, name: nameInput.value, desc: descInput.value }
                    });
                });
            });

            // UPLOAD
            btnUpload.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async (e) => {
                if(!e.target.files[0]) return;
                loading.classList.remove('hidden'); loading.classList.add('flex');
                try {
                    const res = await uploadToImgBB(e.target.files[0], asset.name);
                    CharState.update({ assetUpdate: { id: asset.id, imgbbUrl: res.url } });
                    renderGrid();
                } catch(err) { alert(err.message); }
                finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
            });

            // GENERATE
            btnGen.addEventListener('click', async () => {
                loading.classList.remove('hidden'); loading.classList.add('flex');
                try {
                    // Ambil Style Master dari Tab 2 biar konsisten
                    const stylePrompt = AppState.style.masterPrompt || "Cinematic";
                    const fullPrompt = `${stylePrompt}. ${descInput.value}. White background, studio shot.`;
                    
                    const blob = await generateCharImage(fullPrompt, modelSelect.value);
                    const res = await uploadToImgBB(blob, asset.name);
                    
                    CharState.update({ assetUpdate: { id: asset.id, imgbbUrl: res.url } });
                    renderGrid();
                } catch(err) { alert(err.message); }
                finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
            });
        });
    }

    window.deleteAsset = (idx) => {
        if(confirm("Hapus aset ini?")) {
            const assets = CharState.get().assets;
            assets.splice(idx, 1);
            CharState.update({ assets });
            renderGrid(); // Panggil fungsi render lokal
        }
    };

    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab4_scenes"]').click();
    });
    }
