import { AppState } from '../../core/state.js';
import { SceneState } from './state.js';
import { generateShotImage, uploadToImgBB, breakdownScriptAI } from './api.js';

export default function init() {
    const scriptDisplay = document.getElementById('script-display');
    const scenesContainer = document.getElementById('scenes-container');
    const btnAutoBreakdown = document.getElementById('btn-auto-breakdown');
    const btnAddScene = document.getElementById('btn-add-scene');
    const btnClear = document.getElementById('btn-clear-scenes');
    const emptyTimeline = document.getElementById('empty-timeline');

    // 1. LOAD DATA SKENARIO
    const storyData = AppState.story;
    
    if (storyData && storyData.finalScript && storyData.finalScript.length > 0) {
        // Tampilkan Skenario Detik
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

    // 2. TOMBOL RESET
    btnClear.addEventListener('click', () => {
        if (confirm("⚠️ Hapus semua timeline?")) {
            SceneState.update({ scenes: [], storySignature: "" });
            renderScenes();
        }
    });

    // 3. TOMBOL AUTO BREAKDOWN
    btnAutoBreakdown.addEventListener('click', async () => {
        if(SceneState.get().scenes.length > 0) {
            if(!confirm("Timeline sudah ada isinya. Timpa dengan data baru?")) return;
        }

        btnAutoBreakdown.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Analyzing Screenplay...`;
        btnAutoBreakdown.disabled = true;

        try {
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
                    
                    // Logic Trigger Manual
                    needsCrop: sh.needs_manual_crop || false,
                    cropInstruction: sh.crop_instruction || "",
                    
                    imgUrl: null,
                    refImage: null // Tempat nyimpen link upload manual
                }))
            }));

            SceneState.update({ scenes: newScenes });
            renderScenes();

        } catch (error) {
            alert("Gagal Breakdown: " + error.message);
        } finally {
            btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
            btnAutoBreakdown.disabled = false;
        }
    });

    // 4. TOMBOL TAMBAH MANUAL
    btnAddScene.addEventListener('click', () => {
        const newScene = {
            id: Date.now(),
            location: "New Scene",
            shots: []
        };
        const currentScenes = SceneState.get().scenes || [];
        currentScenes.push(newScene);
        SceneState.update({ scenes: currentScenes });
        renderScenes();
    });

    // === RENDER ENGINE ===
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
                    <div class="flex items-center gap-2 w-full mr-4">
                        <span class="text-accent font-bold text-xs uppercase bg-accent/10 px-2 py-1 rounded">SCENE ${sceneIndex + 1}</span>
                        <input type="text" class="bg-transparent border-none text-white font-bold text-sm w-full focus:outline-none" value="${scene.location}" id="loc-${scene.id}">
                    </div>
                    <button class="text-red-500 hover:text-red-400" onclick="deleteScene(${sceneIndex})"><i class="ph ph-trash"></i></button>
                </div>
                <div class="grid grid-cols-1 gap-6" id="shots-list-${scene.id}"></div>
                <button class="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-gray-500 hover:text-white text-xs font-bold" id="btn-add-shot-${scene.id}">+ Add Shot</button>
            `;

            scenesContainer.appendChild(sceneEl);
            
            // Listener Scene Location
            sceneEl.querySelector(`#loc-${scene.id}`).addEventListener('change', (e) => {
                scene.location = e.target.value;
                SceneState.update();
            });

            // Listener Add Shot Manual
            sceneEl.querySelector(`#btn-add-shot-${scene.id}`).addEventListener('click', () => {
                scene.shots.push({
                    id: Date.now(),
                    info: "Manual Shot",
                    visualPrompt: "",
                    actionPrompt: "",
                    charsInShot: [],
                    imgUrl: null,
                    refImage: null
                });
                SceneState.update();
                renderScenes();
            });

            // RENDER SHOTS
            const shotsContainer = document.getElementById(`shots-list-${scene.id}`);
            scene.shots.forEach((shot, shotIndex) => {
                
                // Cek Status Tombol (Upload vs Generate)
                // Kalau butuh crop DAN belum ada gambar referensi -> Tampilkan tombol Upload
                const isCropNeeded = shot.needsCrop && !shot.refImage;
                
                // Badge Link Karakter
                let charBadge = "";
                if (shot.charsInShot && shot.charsInShot.length > 0) {
                    charBadge = `<div class="text-[10px] text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1 mt-1"><i class="ph ph-link"></i> Detect: ${shot.charsInShot.join(', ')}</div>`;
                }

                // Tombol Kontrol
                let controlButton = "";
                if (isCropNeeded) {
                    controlButton = `
                        <button id="btn-upload-${shot.id}" class="btn-pro bg-yellow-500 hover:bg-yellow-400 text-black text-xs py-2 justify-center mt-auto animate-pulse">
                            <i class="ph ph-upload"></i> ${shot.cropInstruction || "Upload Manual Crop"}
                        </button>
                        <input type="file" id="file-manual-${shot.id}" class="hidden" accept="image/*">
                    `;
                } else {
                    controlButton = `
                        <button id="btn-gen-${shot.id}" class="btn-pro btn-pro-primary text-xs py-2 justify-center mt-auto">
                            <i class="ph ph-lightning"></i> Generate Image
                        </button>
                    `;
                }

                // Kalau sudah ada Ref Image (Upload Manual), kasih info
                let refBadge = "";
                if (shot.refImage) {
                    refBadge = `<div class="text-[9px] text-yellow-400 mt-1"><i class="ph ph-check-circle"></i> Manual Ref Loaded</div>`;
                }

                const shotEl = document.createElement('div');
                shotEl.className = `flex flex-col md:flex-row gap-4 bg-black/30 p-3 rounded-lg border ${isCropNeeded ? 'border-yellow-500/50' : 'border-white/5'}`;

                shotEl.innerHTML = `
                    <!-- GAMBAR -->
                    <div class="w-full md:w-1/3 relative group">
                        <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative" id="drop-zone-${shot.id}">
                            ${shot.imgUrl 
                                ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover">` 
                                : `<div class="text-center p-4 text-gray-600"><i class="ph ${isCropNeeded ? 'ph-warning-circle text-yellow-500' : 'ph-image'} text-3xl mb-1"></i><p class="text-[10px]">${isCropNeeded ? 'Upload Needed' : 'Preview'}</p></div>`
                            }
                            <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                                <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                            </div>
                        </div>
                        <!-- Input File Rahasia buat Drop Zone -->
                        <input type="file" id="file-drop-${shot.id}" class="hidden" accept="image/*">
                        
                        ${shot.imgUrl ? `<a href="${shot.imgUrl}" target="_blank" class="absolute top-2 right-2 bg-black/50 p-1 rounded text-white text-xs hover:bg-accent"><i class="ph ph-eye"></i></a>` : ''}
                    </div>

                    <!-- INPUTS -->
                    <div class="w-full md:w-2/3 flex flex-col gap-2">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="text-[10px] font-bold text-yellow-400">${shot.info || "Shot " + (shotIndex+1)}</span>
                                ${charBadge}
                                ${refBadge}
                            </div>
                            <button class="text-red-500 text-[10px]" onclick="deleteShot(${sceneIndex}, ${shotIndex})">Hapus</button>
                        </div>
                        
                        <div>
                            <label class="text-[9px] text-gray-500 font-bold uppercase">Visual Prompt</label>
                            <textarea id="vis-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none custom-scrollbar">${shot.visualPrompt}</textarea>
                        </div>
                        
                        <div>
                            <label class="text-[9px] text-green-400 font-bold uppercase">Motion Prompt</label>
                            <textarea id="act-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-12 focus:border-green-500 outline-none resize-none custom-scrollbar">${shot.actionPrompt}</textarea>
                        </div>
                        
                        ${controlButton}
                    </div>
                `;
                shotsContainer.appendChild(shotEl);

                // === EVENT LISTENERS ===
                const visInput = document.getElementById(`vis-${shot.id}`);
                const actInput = document.getElementById(`act-${shot.id}`);

                // Auto Save Text
                [visInput, actInput].forEach(inp => {
                    inp.addEventListener('change', () => {
                        shot.visualPrompt = visInput.value;
                        shot.actionPrompt = actInput.value;
                        SceneState.update();
                    });
                });

                // LOGIC 1: TOMBOL UPLOAD MANUAL (Kuning)
                if (isCropNeeded) {
                    const btnUpload = document.getElementById(`btn-upload-${shot.id}`);
                    const fileInput = document.getElementById(`file-manual-${shot.id}`);
                    
                    btnUpload.addEventListener('click', () => fileInput.click());
                    
                    fileInput.addEventListener('change', async (e) => {
                        const file = e.target.files[0];
                        if(!file) return;
                        
                        handleUploadManual(file, shot);
                    });
                } 
                // LOGIC 2: TOMBOL GENERATE (Biru)
                else {
                    const btnGen = document.getElementById(`btn-gen-${shot.id}`);
                    btnGen.addEventListener('click', async () => {
                        const loading = document.getElementById(`loading-${shot.id}`);
                        loading.classList.remove('hidden');
                        loading.classList.add('flex');
                        btnGen.disabled = true;

                        try {
                            // === INI LOGIKA SIMPEL YANG LU MINTA ===
                            let finalRefUrl = null;

                            // Prioritas 1: Ada Upload Manual? Pake itu!
                            if (shot.refImage) {
                                console.log("Using Manual Reference");
                                finalRefUrl = shot.refImage;
                            } 
                            // Prioritas 2: Gak ada manual? Cari Link Karakter Otomatis
                            else {
                                const matchedUrls = [];
                                if (shot.charsInShot && shot.charsInShot.length > 0) {
                                    shot.charsInShot.forEach(charName => {
                                        const charData = AppState.chars.generatedChars.find(c => c.name.toLowerCase().includes(charName.toLowerCase()) || charName.toLowerCase().includes(c.name.toLowerCase()));
                                        if (charData && charData.imgbbUrl) matchedUrls.push(charData.imgbbUrl);
                                    });
                                }
                                if (matchedUrls.length > 0) {
                                    console.log("Using Auto Character Links");
                                    finalRefUrl = matchedUrls.join(',');
                                }
                            }

                            // Generate
                            const blob = await generateShotImage(visInput.value, finalRefUrl);
                            
                            // Upload Result
                            const upload = await uploadToImgBB(blob, `shot_${shot.id}`);
                            
                            shot.imgUrl = upload.url;
                            SceneState.update();
                            renderScenes(); // Refresh UI

                        } catch (e) {
                            alert(e.message);
                        } finally {
                            loading.classList.add('hidden');
                            loading.classList.remove('flex');
                            btnGen.disabled = false;
                        }
                    });
                }

                // LOGIC 3: DROP ZONE (Bisa dipake kapan aja buat override)
                const dropZone = document.getElementById(`drop-zone-${shot.id}`);
                const dropInput = document.getElementById(`file-drop-${shot.id}`);
                
                dropZone.addEventListener('click', () => dropInput.click());
                dropInput.addEventListener('change', (e) => {
                    if(e.target.files[0]) handleUploadManual(e.target.files[0], shot);
                });

            }); // End Shot Loop
        }); // End Scene Loop
    }

    // Helper Upload Manual
    async function handleUploadManual(file, shot) {
        const loading = document.getElementById(`loading-${shot.id}`);
        loading.classList.remove('hidden');
        loading.classList.add('flex');

        try {
            const upload = await uploadToImgBB(file, `ref_${shot.id}`);
            
            shot.imgUrl = upload.url;  // Tampilkan di preview
            shot.refImage = upload.url; // Simpan sebagai REFERENSI UTAMA
            
            // Hapus flag needsCrop karena user udah upload
            // shot.needsCrop = false; // Opsional, kalau mau tombol berubah jadi Generate
            
            SceneState.update();
            renderScenes(); // Refresh UI

        } catch (err) {
            alert("Upload Gagal: " + err.message);
        } finally {
            loading.classList.add('hidden');
            loading.classList.remove('flex');
        }
    }

    // Global Helpers
    window.deleteScene = (idx) => {
        if(confirm("Hapus Scene?")) {
            const scenes = SceneState.get().scenes;
            scenes.splice(idx, 1);
            SceneState.update({ scenes });
            renderScenes();
        }
    };

    window.deleteShot = (sceneIdx, shotIdx) => {
        if(confirm("Hapus Shot?")) {
            const scenes = SceneState.get().scenes;
            scenes[sceneIdx].shots.splice(shotIdx, 1);
            SceneState.update({ scenes });
            renderScenes();
        }
    };
        }
