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

    // 2. AMBIL DATA DARI TAB SEBELAH
    const storyData = AppState.story;
    const styleData = AppState.style;

    if (!storyData || !storyData.characters || storyData.characters.length === 0) {
        charGrid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500">Belum ada karakter. Buat cerita dulu di Tab 1.</div>`;
        return;
    }

    // === LOGIC RASIO (KALKULATOR) ===
    // Default Kotak kalau gak ada settingan
    let imgWidth = 1024;
    let imgHeight = 1024;

    // Cek settingan Tab 2
    if (styleData.ratio === "16:9") {
        imgWidth = 1280;
        imgHeight = 720;  // Landscape (Youtube)
    } else if (styleData.ratio === "9:16") {
        imgWidth = 720;
        imgHeight = 1280; // Portrait (Shorts/TikTok)
    }
    // Kalau 1:1 biarkan 1024x1024

    console.log(`Tab 3: Mode Rasio ${styleData.ratio || "1:1"} (${imgWidth}x${imgHeight})`);

    // 3. RENDER GRID
    renderGrid();

    modelSelect.addEventListener('change', () => {
        CharState.update({ model: modelSelect.value });
    });

    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab4_scenes"]').click();
    });

    function renderGrid() {
        charGrid.innerHTML = "";
        
        storyData.characters.forEach((char, index) => {
            const existingData = savedState.generatedChars.find(c => c.name === char.name);
            const imageUrl = existingData ? existingData.imgbbUrl : null;
            
            // Prompt Gabungan
            const defaultPrompt = `
${styleData.masterPrompt || "Cinematic lighting"}. 
Character: ${char.name}. ${char.desc}. 
Standard camera shot from front, full body visible, neutral background, looking at camera, high resolution, 8k.
            `.trim();

            const card = document.createElement('div');
            card.className = "glass-panel rounded-xl overflow-hidden flex flex-col group border border-white/5 hover:border-accent/30 transition-all";
            
            // Tampilan Link (Hanya muncul kalau sudah ada gambar)
            const linkHtml = imageUrl ? `
                <div class="mt-2 bg-black/40 p-2 rounded border border-white/5 flex items-center gap-2">
                    <i class="ph ph-link text-gray-500 text-xs"></i>
                    <input type="text" value="${imageUrl}" readonly class="bg-transparent text-[10px] text-accent w-full focus:outline-none cursor-pointer hover:text-white transition-colors" onclick="this.select(); document.execCommand('copy'); alert('Link disalin!')">
                </div>
            ` : '';

            card.innerHTML = `
                <div class="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <h3 class="font-bold text-white text-sm flex items-center gap-2"><i class="ph ph-user text-accent"></i> ${char.name}</h3>
                    ${imageUrl ? '<span class="text-[10px] text-green-400 flex items-center gap-1"><i class="ph ph-check-circle-fill"></i> Ready</span>' : ''}
                </div>

                <!-- IMAGE CONTAINER (Aspect Ratio Dinamis) -->
                <!-- Kita pakai style inline height biar ngikutin rasio gambar -->
                <div class="bg-black/50 relative group/img w-full flex items-center justify-center overflow-hidden min-h-[250px]">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" class="w-full h-auto object-cover transition-transform duration-500 group-hover/img:scale-105 cursor-pointer" onclick="window.open('${imageUrl}', '_blank')">`
                        : `<div class="text-gray-600 p-4 text-center"><i class="ph ph-image text-4xl mb-2 opacity-50"></i><p class="text-xs">Siap Casting</p></div>`
                    }
                    
                    <div id="loading-${index}" class="absolute inset-0 bg-black/80 z-20 hidden flex-col items-center justify-center">
                        <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p class="text-[10px] text-white font-mono blink">GENERATING...</p>
                        <p id="status-${index}" class="text-[9px] text-gray-400 mt-1">Init...</p>
                    </div>
                </div>

                <div class="p-3 space-y-3 bg-black/20 flex-grow flex flex-col">
                    <div class="relative">
                        <label class="text-[9px] text-gray-500 font-bold uppercase mb-1 block">Prompt:</label>
                        <textarea id="prompt-${index}" class="w-full bg-black/40 text-gray-300 text-[10px] p-2 rounded border border-white/10 focus:border-accent outline-none resize-none h-16 custom-scrollbar">${existingData ? existingData.finalPrompt : defaultPrompt}</textarea>
                    </div>

                    ${linkHtml} <!-- LINK MUNCUL DISINI -->

                    <button id="btn-gen-${index}" class="w-full mt-auto btn-pro ${imageUrl ? 'bg-white/5 hover:bg-white/10' : 'btn-pro-primary'} text-xs py-2 justify-center">
                        <i class="ph ${imageUrl ? 'ph-arrows-clockwise' : 'ph-lightning'} text-sm"></i>
                        <span>${imageUrl ? 'Regenerate' : 'Generate Visual'}</span>
                    </button>
                </div>
            `;

            charGrid.appendChild(card);

            // EVENT LISTENER
            const btnGen = card.querySelector(`#btn-gen-${index}`);
            const txtPrompt = card.querySelector(`#prompt-${index}`);
            const loading = card.querySelector(`#loading-${index}`);
            const statusTxt = card.querySelector(`#status-${index}`);

            btnGen.addEventListener('click', async () => {
                const finalPrompt = txtPrompt.value.trim();
                const model = modelSelect.value;

                loading.classList.remove('hidden');
                loading.classList.add('flex');
                btnGen.disabled = true;

                try {
                    // 1. Generate (Kirim Width & Height yang sudah dihitung)
                    statusTxt.innerText = `Painting (${imgWidth}x${imgHeight})...`;
                    const blob = await generateCharImage(finalPrompt, model, imgWidth, imgHeight);

                    // 2. Upload
                    statusTxt.innerText = "Uploading to ImgBB...";
                    const uploadResult = await uploadToImgBB(blob, char.name);

                    // 3. Save
                    CharState.update({
                        charUpdate: {
                            name: char.name,
                            finalPrompt: finalPrompt,
                            imgbbUrl: uploadResult.url,
                            deleteUrl: uploadResult.deleteUrl
                        }
                    });

                    renderGrid(); // Refresh UI

                } catch (error) {
                    alert(`Gagal: ${error.message}`);
                    loading.classList.add('hidden');
                    loading.classList.remove('flex');
                    btnGen.disabled = false;
                }
            });
        });
    }
        }
