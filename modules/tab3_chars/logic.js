import { AppState } from '../../core/state.js';
import { CharState } from './state.js';
import { generateCharImage, uploadToImgBB } from './api.js';

export default function init() {
    const charGrid = document.getElementById('char-grid');
    const modelSelect = document.getElementById('model-select');
    const btnNext = document.getElementById('btn-next-tab');

    // 1. LOAD PREFERENCES
    const savedState = CharState.get();
    if (savedState.selectedModel) {
        modelSelect.value = savedState.selectedModel;
    }

    // 2. LOAD DATA DARI TAB 1 & 2
    const storyData = AppState.story; // Dari Tab 1
    const styleData = AppState.style; // Dari Tab 2

    // Validasi Data
    if (!storyData || !storyData.characters || storyData.characters.length === 0) {
        charGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-6 inline-block">
                    <i class="ph ph-warning-circle text-4xl text-red-400 mb-2"></i>
                    <h3 class="text-white font-bold">Data Karakter Kosong</h3>
                    <p class="text-gray-400 text-sm mt-1">Silakan generate cerita dulu di Tab 1.</p>
                    <button onclick="document.querySelector('[data-target=tab1_story]').click()" class="mt-4 text-xs bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Ke Tab Story</button>
                </div>
            </div>
        `;
        return;
    }

    // 3. RENDER GRID
    renderGrid();

    // Listener Ganti Model
    modelSelect.addEventListener('change', () => {
        CharState.update({ model: modelSelect.value });
    });

    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab4_scenes"]').click();
    });

    // --- CORE RENDER FUNCTION ---
    function renderGrid() {
        charGrid.innerHTML = "";
        
        storyData.characters.forEach((char, index) => {
            // Cek apakah karakter ini sudah punya gambar?
            const existingData = savedState.generatedChars.find(c => c.name === char.name);
            const imageUrl = existingData ? existingData.imgbbUrl : null;
            
            // Default Prompt Gabungan
            // Rumus: [Style] + [Char Desc] + [Camera Rules]
            const defaultPrompt = `
${styleData.masterPrompt || "Cinematic lighting, high detail"}. 
Character: ${char.name}. ${char.desc}. 
Standard camera shot from front, full body visible, neutral background, looking at camera, high resolution, 8k.
            `.trim();

            // Card HTML
            const card = document.createElement('div');
            card.className = "glass-panel rounded-xl overflow-hidden flex flex-col group border border-white/5 hover:border-accent/30 transition-all";
            
            card.innerHTML = `
                <!-- HEADER -->
                <div class="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <h3 class="font-bold text-white text-sm flex items-center gap-2">
                        <i class="ph ph-user text-accent"></i> ${char.name}
                    </h3>
                    ${imageUrl ? '<span class="text-[10px] text-green-400 flex items-center gap-1"><i class="ph ph-check-circle-fill"></i> Ready</span>' : '<span class="text-[10px] text-gray-500">Not Generated</span>'}
                </div>

                <!-- IMAGE AREA -->
                <div class="aspect-[2/3] bg-black/50 relative group/img">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105 cursor-pointer" onclick="window.open('${imageUrl}', '_blank')">`
                        : `<div class="absolute inset-0 flex flex-col items-center justify-center text-gray-600 p-4 text-center">
                             <i class="ph ph-image text-4xl mb-2 opacity-50"></i>
                             <p class="text-xs">Klik Generate untuk membuat visual</p>
                           </div>`
                    }
                    
                    <!-- Loading Overlay (Hidden by default) -->
                    <div id="loading-${index}" class="absolute inset-0 bg-black/80 z-20 hidden flex-col items-center justify-center">
                        <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p class="text-[10px] text-white font-mono blink">GENERATING...</p>
                        <p id="status-${index}" class="text-[9px] text-gray-400 mt-1">Contacting AI...</p>
                    </div>
                </div>

                <!-- CONTROLS -->
                <div class="p-3 space-y-3 bg-black/20 flex-grow flex flex-col">
                    <!-- Prompt Editor -->
                    <div class="relative">
                        <label class="text-[9px] text-gray-500 font-bold uppercase mb-1 block">Prompt:</label>
                        <textarea id="prompt-${index}" class="w-full bg-black/40 text-gray-300 text-[10px] p-2 rounded border border-white/10 focus:border-accent outline-none resize-none h-20 custom-scrollbar">${existingData ? existingData.finalPrompt : defaultPrompt}</textarea>
                    </div>

                    <!-- Action Button -->
                    <button id="btn-gen-${index}" class="w-full mt-auto btn-pro ${imageUrl ? 'bg-white/5 hover:bg-white/10' : 'btn-pro-primary'} text-xs py-2 justify-center">
                        <i class="ph ${imageUrl ? 'ph-arrows-clockwise' : 'ph-lightning'} text-sm"></i>
                        <span>${imageUrl ? 'Regenerate' : 'Generate Visual'}</span>
                    </button>
                </div>
            `;

            charGrid.appendChild(card);

            // EVENT LISTENER PER KARTU
            const btnGen = card.querySelector(`#btn-gen-${index}`);
            const txtPrompt = card.querySelector(`#prompt-${index}`);
            const loading = card.querySelector(`#loading-${index}`);
            const statusTxt = card.querySelector(`#status-${index}`);

            btnGen.addEventListener('click', async () => {
                const finalPrompt = txtPrompt.value.trim();
                const model = modelSelect.value;

                // UI Loading
                loading.classList.remove('hidden');
                loading.classList.add('flex');
                btnGen.disabled = true;

                try {
                    // 1. Generate Image
                    statusTxt.innerText = `Painting (${model})...`;
                    const blob = await generateCharImage(finalPrompt, model);

                    // 2. Upload ImgBB
                    statusTxt.innerText = "Uploading to ImgBB...";
                    const uploadResult = await uploadToImgBB(blob, char.name);

                    // 3. Simpan ke State
                    CharState.update({
                        charUpdate: {
                            name: char.name,
                            finalPrompt: finalPrompt,
                            imgbbUrl: uploadResult.url,
                            deleteUrl: uploadResult.deleteUrl
                        }
                    });

                    // 4. Refresh Grid (Biar gambar muncul)
                    renderGrid();

                } catch (error) {
                    alert(`Gagal: ${error.message}`);
                    loading.classList.add('hidden'); // Sembunyikan loading kalau error
                    loading.classList.remove('flex');
                    btnGen.disabled = false;
                }
            });
        });
    }
        }
