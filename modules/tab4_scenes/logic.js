import { AppState } from '../../core/state.js';
import { SceneState } from './state.js';
import { generateShotImage, uploadToImgBB, breakdownScriptAI } from './api.js';

export default function init() {
    const scriptDisplay = document.getElementById('script-display');
    const scenesContainer = document.getElementById('scenes-container');
    const btnAutoBreakdown = document.getElementById('btn-auto-breakdown');
    const btnClear = document.getElementById('btn-clear-scenes');
    const emptyTimeline = document.getElementById('empty-timeline');

    // 1. LOAD DATA SKENARIO (YANG ADA DETIKNYA)
    const storyData = AppState.story;
    
    // Cek apakah Fase 2 (Skenario) sudah dibuat di Tab 1?
    if (storyData && storyData.finalScript && storyData.finalScript.length > 0) {
        // Tampilkan Skenario Rapi
        scriptDisplay.innerHTML = storyData.finalScript.map(s => `
            <div class="mb-3 border-b border-white/5 pb-2">
                <div class="flex justify-between text-green-400 text-xs font-bold">
                    <span>${s.timestamp}</span>
                    <span>${s.location}</span>
                </div>
                <p class="text-gray-300 text-xs mt-1">${s.visual}</p>
            </div>
        `).join('');
        
        btnAutoBreakdown.disabled = false;
    } else {
        scriptDisplay.innerHTML = `
            <div class="text-center mt-10">
                <i class="ph ph-warning text-3xl text-yellow-500 mb-2"></i>
                <p class="text-red-400 font-bold">Skenario Belum Ada!</p>
                <p class="text-gray-500 text-xs mt-1">Pergi ke Tab 1 -> Isi Durasi -> Klik "Generate Timed Screenplay"</p>
            </div>
        `;
        btnAutoBreakdown.disabled = true;
    }

    renderScenes();

    // 2. AUTO BREAKDOWN (PAKAI DATA SKENARIO)
    btnAutoBreakdown.addEventListener('click', async () => {
        if(SceneState.get().scenes.length > 0) {
            if(!confirm("Reset timeline dan buat baru dari Skenario?")) return;
        }

        btnAutoBreakdown.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Analyzing Screenplay...`;
        btnAutoBreakdown.disabled = true;

        try {
            // Kirim Array Skenario ke AI
            const result = await breakdownScriptAI(storyData.finalScript);
            
            const newScenes = result.scenes.map((s, i) => ({
                id: Date.now() + i,
                location: s.location,
                shots: s.shots.map((sh, j) => ({
                    id: Date.now() + i + j + 100,
                    info: sh.shot_info,
                    visualPrompt: sh.visual_prompt,
                    actionPrompt: sh.video_prompt,
                    charsInShot: sh.characters_in_shot || [],
                    
                    // FITUR BARU: MANUAL CROP TRIGGER
                    needsCrop: sh.needs_manual_crop || false,
                    cropInstruction: sh.crop_instruction || "",
                    
                    imgUrl: null,
                    refImage: null
                }))
            }));

            SceneState.update({ scenes: newScenes });
            renderScenes();

        } catch (error) {
            alert("Gagal: " + error.message);
        } finally {
            btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
            btnAutoBreakdown.disabled = false;
        }
    });

    // 3. RENDER UI (DENGAN LOGIC CROP)
    function renderScenes() {
        const scenes = SceneState.get().scenes || [];
        scenesContainer.innerHTML = "";

        if (scenes.length === 0) {
            if(emptyTimeline) emptyTimeline.classList.remove('hidden');
            return;
        }
        if(emptyTimeline) emptyTimeline.classList.add('hidden');

        scenes.forEach((scene, sceneIndex) => {
            const sceneEl = document.createElement('div');
            sceneEl.className = "bg-white/5 border border-white/10 rounded-xl p-4 relative animate-fade-in";
            
            sceneEl.innerHTML = `
                <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <span class="text-accent font-bold text-xs uppercase bg-accent/10 px-2 py-1 rounded">${scene.location}</span>
                    <button class="text-red-500 hover:text-red-400" onclick="deleteScene(${sceneIndex})"><i class="ph ph-trash"></i></button>
                </div>
                <div class="grid grid-cols-1 gap-6" id="shots-list-${scene.id}"></div>
            `;

            scenesContainer.appendChild(sceneEl);
            
            const shotsContainer = document.getElementById(`shots-list-${scene.id}`);
            scene.shots.forEach((shot) => {
                // LOGIC TOMBOL GENERATE vs UPLOAD
                // Kalau butuh crop, tombol Generate jadi tombol Upload
                
                const isCropNeeded = shot.needsCrop && !shot.refImage; // Butuh crop & belum ada gambar
                
                const controlButton = isCropNeeded
                    ? `<button id="btn-upload-${shot.id}" class="btn-pro bg-yellow-500 hover:bg-yellow-400 text-black text-xs py-2 justify-center mt-auto animate-pulse">
                         <i class="ph ph-upload"></i> ${shot.cropInstruction || "Upload Manual Crop"}
                       </button>
                       <input type="file" id="file-manual-${shot.id}" class="hidden" accept="image/*">`
                    : `<button id="btn-gen-${shot.id}" class="btn-pro btn-pro-primary text-xs py-2 justify-center mt-auto">
                         <i class="ph ph-lightning"></i> Generate Image
                       </button>`;

                const shotEl = document.createElement('div');
                shotEl.className = `flex flex-col md:flex-row gap-4 bg-black/30 p-3 rounded-lg border ${isCropNeeded ? 'border-yellow-500/50' : 'border-white/5'}`;

                shotEl.innerHTML = `
                    <!-- GAMBAR -->
                    <div class="w-full md:w-1/3 relative group">
                        <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                            ${shot.imgUrl 
                                ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover">` 
                                : `<div class="text-center p-4 text-gray-600">
                                     <i class="ph ${isCropNeeded ? 'ph-warning-circle text-yellow-500' : 'ph-image'} text-3xl mb-1"></i>
                                     <p class="text-[10px]">${isCropNeeded ? 'Butuh Upload Manual' : 'Preview'}</p>
                                   </div>`
                            }
                            <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                                <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                            </div>
                        </div>
                        ${shot.imgUrl ? `<a href="${shot.imgUrl}" target="_blank" class="absolute top-2 right-2 bg-black/50 p-1 rounded text-white text-xs hover:bg-accent"><i class="ph ph-eye"></i></a>` : ''}
                    </div>

                    <!-- PROMPTS -->
                    <div class="w-full md:w-2/3 flex flex-col gap-2">
                        <div class="flex justify-between items-start">
                            <span class="text-[10px] font-bold text-yellow-400">${shot.info}</span>
                        </div>
                        <div>
                            <label class="text-[9px] text-gray-500 font-bold uppercase">Visual Prompt</label>
                            <textarea id="vis-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none custom-scrollbar">${shot.visualPrompt}</textarea>
                        </div>
                        <div>
                            <label class="text-[9px] text-green-400 font-bold uppercase">Motion Prompt</label>
                            <textarea id="act-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-12 focus:border-green-500 outline-none resize-none custom-scrollbar">${shot.actionPrompt}</textarea>
                        </div>
                        
                        <!-- TOMBOL DINAMIS (GENERATE / UPLOAD) -->
                        ${controlButton}
                    </div>
                `;
                shotsContainer.appendChild(shotEl);

                // EVENT LISTENERS
                const visInput = document.getElementById(`vis-${shot.id}`);
                const actInput = document.getElementById(`act-${shot.id}`);

                [visInput, actInput].forEach(inp => {
                    inp.addEventListener('change', () => {
                        shot.visualPrompt = visInput.value;
                        shot.actionPrompt = actInput.value;
                        SceneState.update();
                    });
                });

                // LOGIC TOMBOL UPLOAD (MANUAL CROP)
                if (isCropNeeded) {
                    const btnUpload = document.getElementById(`btn-upload-${shot.id}`);
                    const fileInput = document.getElementById(`file-manual-${shot.id}`);
                    
                    btnUpload.addEventListener('click', () => fileInput.click());
                    
                    fileInput.addEventListener('change', async (e) => {
                        const file = e.target.files[0];
                        if(!file) return;
                        
                        const loading = document.getElementById(`loading-${shot.id}`);
                        loading.classList.remove('hidden');
                        loading.classList.add('flex');
                        
                        try {
                            // Upload Crop ke ImgBB
                            const upload = await uploadToImgBB(file, `crop_${shot.id}`);
                            
                            // Simpan sebagai Referensi Utama
                            shot.refImage = upload.url;
                            shot.imgUrl = upload.url; // Tampilkan juga
                            
                            // Hapus status needsCrop karena user udah upload
                            // shot.needsCrop = false; // (Opsional: biarin true biar tau ini hasil crop)
                            
                            SceneState.update();
                            renderScenes(); // Refresh biar tombol berubah jadi Generate (buat refine) atau Stay
                            
                        } catch (err) {
                            alert("Upload Gagal: " + err.message);
                        } finally {
                            loading.classList.add('hidden');
                            loading.classList.remove('flex');
                        }
                    });
                } 
                // LOGIC TOMBOL GENERATE (NORMAL)
                else {
                    const btnGen = document.getElementById(`btn-gen-${shot.id}`);
                    btnGen.addEventListener('click', async () => {
                        const loading = document.getElementById(`loading-${shot.id}`);
                        loading.classList.remove('hidden');
                        loading.classList.add('flex');
                        btnGen.disabled = true;

                        try {
                            // Logic Link Karakter (Normal)
                            const matchedUrls = [];
                            if (shot.charsInShot && shot.charsInShot.length > 0) {
                                shot.charsInShot.forEach(charName => {
                                    const charData = AppState.chars.generatedChars.find(c => c.name.toLowerCase().includes(charName.toLowerCase()) || charName.toLowerCase().includes(c.name.toLowerCase()));
                                    if (charData && charData.imgbbUrl) matchedUrls.push(charData.imgbbUrl);
                                });
                            }

                            // Prioritas: Kalau ada Manual Crop (refImage), PAKE ITU.
                            // Kalau gak ada, pake Link Karakter (matchedUrls).
                            let refUrls = shot.refImage ? shot.refImage : (matchedUrls.length > 0 ? matchedUrls.join(',') : null);

                            const blob = await generateShotImage(visInput.value, refUrls);
                            const upload = await uploadToImgBB(blob, `shot_${shot.id}`);
                            
                            shot.imgUrl = upload.url;
                            SceneState.update();
                            renderScenes();

                        } catch (e) {
                            alert(e.message);
                        } finally {
                            loading.classList.add('hidden');
                            loading.classList.remove('flex');
                            btnGen.disabled = false;
                        }
                    });
                }
            });
        });
    }

    // ... (Fungsi deleteScene dan btnClear sama seperti sebelumnya) ...
    // Pastikan copy paste fungsi deleteScene dan btnClear dari kode sebelumnya ya bro
    window.deleteScene = (idx) => {
        if(confirm("Hapus Scene?")) {
            const scenes = SceneState.get().scenes;
            scenes.splice(idx, 1);
            SceneState.update({ scenes });
            renderScenes();
        }
    };
    
    document.getElementById('btn-clear-scenes').addEventListener('click', () => {
        if(confirm("Reset semua timeline?")) {
            SceneState.update({ scenes: [], storySignature: "" });
            renderScenes();
        }
    });
                    }
