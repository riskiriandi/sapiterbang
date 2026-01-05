import { AppState } from '../../core/state.js';
import { CharState } from './state.js';
import { generateCharImage, uploadToImgBB, analyzePropsAI } from './api.js';

export default function init() {
    // Safety Check Element
    const assetGrid = document.getElementById('asset-grid');
    if (!assetGrid) return console.error("Tab 3 HTML missing");

    const emptyState = document.getElementById('empty-assets');
    const btnAnalyze = document.getElementById('btn-analyze-assets');
    const btnAddManual = document.getElementById('btn-add-manual');
    const modelSelect = document.getElementById('model-select');
    const btnNext = document.getElementById('btn-next-tab');

    // 1. LOAD DATA
    const savedState = CharState.get();
    if (savedState.selectedModel) modelSelect.value = savedState.selectedModel;
    renderGrid();

    // 2. ANALYZE SCRIPT (Logic Baru)
    btnAnalyze.addEventListener('click', async () => {
        const tab1Chars = AppState.story ? AppState.story.characters : [];
        const script = AppState.story ? AppState.story.finalScript : [];

        if (!tab1Chars || tab1Chars.length === 0) return alert("Generate Karakter di Tab 1 dulu!");

        if (CharState.get().assets.length > 0 && !confirm("Timpa data?")) return;

        btnAnalyze.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Filtering Assets...`;
        btnAnalyze.disabled = true;

        try {
            // A. UTAMA: Import Karakter Full Body (Bisa Generate)
            const mainChars = tab1Chars.map((c, i) => ({
                id: Date.now() + i,
                name: c.name,
                type: 'main', // Tipe Utama
                desc: c.desc,
                imgbbUrl: null
            }));

            // B. TAMBAHAN: Cari Potongan Tubuh / Detail (Cuma Upload)
            let partAssets = [];
            if (script && script.length > 0) {
                const result = await analyzePropsAI(script);
                partAssets = result.assets.map((p, i) => ({
                    id: Date.now() + 100 + i,
                    name: p.name,
                    type: 'part', // Tipe Potongan
                    desc: p.reason, // Alasannya (misal: "Shot 2 Close up")
                    imgbbUrl: null
                }));
            }

            // Gabung
            const allAssets = [...mainChars, ...partAssets];
            
            CharState.update({ assets: allAssets });
            renderGrid();

        } catch (e) {
            alert("Gagal: " + e.message);
        } finally {
            btnAnalyze.innerHTML = `<i class="ph ph-scan"></i> Analyze Script`;
            btnAnalyze.disabled = false;
        }
    });

    // 3. MANUAL ADD
    btnAddManual.addEventListener('click', () => {
        const newAsset = {
            id: Date.now(),
            name: "Custom Asset",
            type: "part", // Default manual dianggap part/prop
            desc: "Manual addition",
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
            const isMain = asset.type === 'main';
            
            // Visual Beda buat Main vs Part
            const badgeColor = isMain ? 'bg-accent/20 text-accent' : 'bg-yellow-500/20 text-yellow-400';
            const icon = isMain ? 'ph-user' : 'ph-puzzle-piece';
            const typeLabel = isMain ? 'MAIN CHAR' : 'ASSET / PART';

            const card = document.createElement('div');
            card.className = "glass-panel rounded-xl overflow-hidden flex flex-col border border-white/5";

            // Tombol Generate cuma ada buat Main Character
            // Tombol Upload ada buat semuanya
            const buttonsHtml = isMain 
                ? `<div class="flex gap-2 mt-auto">
                     <button id="btn-upload-${asset.id}" class="flex-1 btn-pro bg-white/10 hover:bg-white/20 text-xs py-2 justify-center" title="Upload Manual"><i class="ph ph-upload"></i></button>
                     <button id="btn-gen-${asset.id}" class="flex-1 btn-pro btn-pro-primary text-xs py-2 justify-center" title="Generate AI"><i class="ph ph-lightning"></i></button>
                   </div>`
                : `<button id="btn-upload-${asset.id}" class="w-full mt-auto btn-pro bg-yellow-500 hover:bg-yellow-400 text-black text-xs py-2 justify-center font-bold">
                     <i class="ph ph-upload"></i> UPLOAD CROP
                   </button>`;

            // Deskripsi: Kalau Main Char bisa diedit (buat prompt). Kalau Part cuma info (readonly).
            const descHtml = isMain
                ? `<textarea id="desc-${asset.id}" class="w-full bg-black/40 text-gray-300 text-[10px] p-2 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none custom-scrollbar">${asset.desc}</textarea>`
                : `<div class="bg-white/5 p-2 rounded text-[10px] text-gray-400 italic h-10 overflow-y-auto mb-2">Need: ${asset.desc}</div>`;

            card.innerHTML = `
                <div class="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <input type="text" value="${asset.name}" class="bg-transparent font-bold text-white text-sm w-2/3 focus:outline-none" id="name-${asset.id}">
                    <span class="text-[9px] ${badgeColor} px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                        <i class="ph ${icon}"></i> ${typeLabel}
                    </span>
                </div>

                <div class="aspect-square bg-black/50 relative group w-full flex items-center justify-center overflow-hidden">
                    ${asset.imgbbUrl 
                        ? `<img src="${asset.imgbbUrl}" class="w-full h-full object-cover cursor-pointer" onclick="window.open('${asset.imgbbUrl}')">`
                        : `<div class="text-center p-4 text-gray-600"><i class="ph ${isMain ? 'ph-image' : 'ph-crop'} text-3xl mb-1"></i><p class="text-[10px]">${isMain ? 'Empty' : 'Upload Required'}</p></div>`
                    }
                    <div id="loading-${asset.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                        <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                    </div>
                </div>

                <div class="p-3 space-y-3 bg-black/20 flex-grow flex flex-col">
                    ${descHtml}
                    
                    ${asset.imgbbUrl ? `
                    <div class="flex items-center gap-2 bg-black/40 p-1 rounded border border-green-500/30">
                        <i class="ph ph-link text-green-400 text-xs"></i>
                        <input type="text" value="${asset.imgbbUrl}" readonly class="bg-transparent text-[9px] text-gray-400 w-full focus:outline-none">
                    </div>` : ''}

                    ${buttonsHtml}
                    
                    <button class="text-red-500 text-[10px] w-full hover:text-white mt-1" onclick="deleteAsset(${index})">Hapus</button>
                    <input type="file" id="file-${asset.id}" class="hidden" accept="image/*">
                </div>
            `;

            assetGrid.appendChild(card);

            // LISTENERS
            const nameInput = document.getElementById(`name-${asset.id}`);
            const btnUpload = document.getElementById(`btn-upload-${asset.id}`);
            const fileInput = document.getElementById(`file-${asset.id}`);
            const loading = document.getElementById(`loading-${asset.id}`);

            nameInput.addEventListener('change', () => {
                CharState.update({ assetUpdate: { id: asset.id, name: nameInput.value } });
            });

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

            // Listener Generate (Cuma buat Main Char)
            if (isMain) {
                const btnGen = document.getElementById(`btn-gen-${asset.id}`);
                const descInput = document.getElementById(`desc-${asset.id}`);
                
                descInput.addEventListener('change', () => {
                    CharState.update({ assetUpdate: { id: asset.id, desc: descInput.value } });
                });

                btnGen.addEventListener('click', async () => {
                    loading.classList.remove('hidden'); loading.classList.add('flex');
                    try {
                        const stylePrompt = AppState.style.masterPrompt || "Cinematic lighting";
                        const fullPrompt = `${stylePrompt}. ${descInput.value}. (Full body shot, neutral studio background).`;
                        
                        const blob = await generateCharImage(fullPrompt, modelSelect.value);
                        const res = await uploadToImgBB(blob, asset.name);
                        
                        CharState.update({ assetUpdate: { id: asset.id, imgbbUrl: res.url } });
                        renderGrid();
                    } catch(err) { alert(err.message); }
                    finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
                });
            }
        });
    }

    window.deleteAsset = (idx) => {
        if(confirm("Hapus aset ini?")) {
            const assets = CharState.get().assets;
            assets.splice(idx, 1);
            CharState.update({ assets });
            renderGrid();
        }
    };

    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab4_scenes"]').click();
    });
}
