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

    // === 1. FUNGSI LOAD DATA (Dibuat Dinamis) ===
    function refreshData() {
        const storyData = AppState.story; // Selalu ambil data terbaru
        
        if (storyData && storyData.finalScript && storyData.finalScript.length > 0) {
            scriptDisplay.innerHTML = storyData.finalScript.map(s => `
                <div class="mb-3 border-b border-white/5 pb-2">
                    <div class="flex justify-between text-green-400 text-xs font-bold">
                        <span>${s.timestamp}</span>
                        <span>${s.location}</span>
                    </div>
                    <p class="text-gray-300 text-xs mt-1">${s.visual}</p>
                </div>
            `).join('');
            
            if(btnAutoBreakdown) {
                btnAutoBreakdown.disabled = false;
                btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
            }
        } else {
            scriptDisplay.innerHTML = `<div class="text-center mt-10 text-red-400">Skenario Kosong.<br><span class="text-gray-500 text-[10px]">Buat dulu di Tab 1.</span></div>`;
            if(btnAutoBreakdown) btnAutoBreakdown.disabled = true;
        }
    }

    // Jalankan saat init
    refreshData();
    renderScenes();

    // === 2. EVENT LISTENERS GLOBAL ===

    // Tombol Reset
    if(btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm("Hapus semua timeline shot?")) {
                SceneState.update({ scenes: [], storySignature: "" });
                renderScenes();
            }
        });
    }

    // Tombol AI Breakdown
    if(btnAutoBreakdown) {
        btnAutoBreakdown.addEventListener('click', async () => {
            const currentStory = AppState.story;
            if(!currentStory || !currentStory.finalScript) { 
                alert("Data cerita tidak ditemukan!"); return; 
            }

            if(SceneState.get().scenes.length > 0 && !confirm("Timpa timeline yang ada?")) return;

            btnAutoBreakdown.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Analyzing...`;
            btnAutoBreakdown.disabled = true;

            try {
                const result = await breakdownScriptAI(currentStory.finalScript);
                const newScenes = result.scenes.map((s, i) => ({
                    id: Date.now() + i,
                    location: s.location,
                    shots: s.shots.map((sh, j) => ({
                        id: Date.now() + i + j + 100,
                        info: sh.shot_info,
                        visualPrompt: sh.visual_prompt,
                        actionPrompt: sh.video_prompt,
                        charsInShot: sh.characters_in_shot || [],
                        needsCrop: sh.needs_manual_crop || false,
                        cropInstruction: sh.crop_instruction || "",
                        imgUrl: null,
                        refImage: null 
                    }))
                }));

                SceneState.update({ scenes: newScenes });
                renderScenes();
            } catch (error) {
                alert("Director Error: " + error.message);
            } finally {
                btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
                btnAutoBreakdown.disabled = false;
            }
        });
    }

    // Tombol Tambah Scene Manual
    if(btnAddScene) {
        btnAddScene.addEventListener('click', () => {
            const newScene = { id: Date.now(), location: "MANUAL SCENE", shots: [] };
            const scenes = SceneState.get().scenes || [];
            scenes.push(newScene);
            SceneState.update({ scenes });
            renderScenes();
        });
    }

    // === 3. RENDER ENGINE ===
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
            sceneEl.className = "bg-white/5 border border-white/10 rounded-xl p-4 relative animate-fade-in mb-6";
            
            sceneEl.innerHTML = `
                <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <div class="flex items-center gap-2 w-full">
                        <i class="ph ph-map-pin text-accent"></i>
                        <input type="text" class="bg-transparent border-none text-white font-bold text-sm uppercase w-full focus:outline-none" value="${scene.location}" id="loc-${scene.id}">
                    </div>
                    <button class="text-red-500 hover:text-white hover:bg-red-500/50 p-1 rounded" onclick="deleteScene(${sceneIndex})"><i class="ph ph-trash"></i></button>
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
                    id: Date.now(), info: "New Shot", visualPrompt: "", actionPrompt: "", charsInShot: [], imgUrl: null, refImage: null 
                });
                SceneState.update();
                renderScenes();
            });

            const shotsContainer = document.getElementById(`shots-list-${scene.id}`);
            
            scene.shots.forEach((shot, shotIndex) => {
                // LOGIC: State Upload vs Generate
                const isWaitingForUpload = shot.needsCrop && !shot.refImage;
                
                // Badges Karakter
                let charBadges = "";
                if(shot.charsInShot && shot.charsInShot.length > 0) {
                    charBadges = shot.charsInShot.map(c => `<span class="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded border border-indigo-500/30">${c}</span>`).join(" ");
                }

                let controlArea = "";

                if (isWaitingForUpload) {
                    // TAMPILAN 1: WAJIB UPLOAD
                    controlArea = `
                        <div class="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-center">
                            <p class="text-[10px] text-yellow-400 mb-2 font-bold flex items-center justify-center gap-2">
                                <i class="ph ph-warning-circle"></i> ${shot.cropInstruction || "Upload Referensi (Wajib)"}
                            </p>
                            <button id="btn-upload-${shot.id}" class="w-full btn-pro bg-yellow-500 hover:bg-yellow-400 text-black text-xs py-2 justify-center font-bold">
                                <i class="ph ph-upload"></i> Upload Foto
                            </button>
                            <input type="file" id="file-manual-${shot.id}" class="hidden" accept="image/*">
                        </div>
                    `;
                } else {
                    // TAMPILAN 2: SIAP GENERATE
                    controlArea = `
                        <div class="mb-2">
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] text-gray-400 font-bold">IMAGE REFERENCES (URL)</label>
                                <span class="text-[9px] text-accent cursor-pointer hover:underline" id="btn-autodetect-${shot.id}">
                                    <i class="ph ph-magic-wand"></i> Auto-Detect
                                </span>
                            </div>
                            <input type="text" id="ref-input-${shot.id}" value="${shot.refImage || ''}" class="w-full bg-black/50 text-[10px] text-gray-300 p-2 rounded border border-white/10 focus:border-accent outline-none" placeholder="Paste URL ImgBB (Pisahkan koma)">
                        </div>
                        
                        <div class="flex gap-2">
                            <button id="btn-gen-${shot.id}" class="flex-1 btn-pro btn-pro-primary text-xs py-2 justify-center">
                                <i class="ph ph-lightning"></i> Generate
                            </button>
                            <button id="btn-reupload-${shot.id}" class="w-10 bg-white/5 border border-white/10 rounded hover:bg-white/10 flex items-center justify-center text-gray-400" title="Upload Manual">
                                <i class="ph ph-upload-simple"></i>
                            </button>
                            <input type="file" id="file-reupload-${shot.id}" class="hidden" accept="image/*">
                        </div>
                    `;
                }

                const shotEl = document.createElement('div');
                shotEl.className = `flex flex-col md:flex-row gap-4 bg-black/30 p-3 rounded-lg border ${isWaitingForUpload ? 'border-yellow-500/50' : 'border-white/5'}`;

                shotEl.innerHTML = `
                    <!-- IMAGE PREVIEW -->
                    <div class="w-full md:w-1/3 relative group">
                        <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                            ${shot.imgUrl 
                                ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover">` 
                                : `<div class="text-center p-4 text-gray-500 flex flex-col items-center">
                                     <i class="ph ph-image text-2xl mb-1"></i>
                                     <span class="text-[9px] font-mono">${isWaitingForUpload ? 'WAITING UPLOAD' : 'NO IMAGE'}</span>
                                   </div>`
                            }
                            <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-20">
                                <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                            </div>
                        </div>
                        ${shot.imgUrl ? `<a href="${shot.imgUrl}" target="_blank" class="absolute top-2 right-2 bg-black/60 p-1 rounded text-white text-xs hover:bg-accent"><i class="ph ph-eye"></i></a>` : ''}
                    </div>

                    <!-- CONTROLS -->
                    <div class="w-full md:w-2/3 flex flex-col gap-2">
                        <div class="flex justify-between items-start">
                            <div>
                                <input type="text" id="info-${shot.id}" value="${shot.info || "Shot"}" class="bg-transparent border-none text-yellow-400 font-bold text-xs focus:outline-none w-full">
                                <div class="mt-1">${charBadges}</div>
                            </div>
                            <button class="text-red-500 text-[10px]" onclick="deleteShot(${sceneIndex}, ${shotIndex})">Hapus</button>
                        </div>
                        
                        <textarea id="vis-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-14 focus:border-accent outline-none resize-none custom-scrollbar" placeholder="Visual Prompt">${shot.visualPrompt}</textarea>
                        <textarea id="act-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-8 focus:border-green-500 outline-none resize-none custom-scrollbar" placeholder="Action Prompt">${shot.actionPrompt}</textarea>

                        <div class="pt-2 border-t border-white/5">
                            ${controlArea}
                        </div>
                    </div>
                `;
                shotsContainer.appendChild(shotEl);

                // === LISTENERS PER SHOT ===
                
                // 1. Simpan Text
                const visInput = document.getElementById(`vis-${shot.id}`);
                const actInput = document.getElementById(`act-${shot.id}`);
                const infoInput = document.getElementById(`info-${shot.id}`);
                
                [visInput, actInput, infoInput].forEach(inp => {
                    inp.addEventListener('change', () => {
                        shot.visualPrompt = visInput.value;
                        shot.actionPrompt = actInput.value;
                        shot.info = infoInput.value;
                        SceneState.update();
                    });
                });

                // 2. Helper Upload
                const handleUpload = async (file) => {
                    const loading = document.getElementById(`loading-${shot.id}`);
                    loading.classList.remove('hidden'); loading.classList.add('flex');
                    try {
                        const upload = await uploadToImgBB(file, `ref_${shot.id}`);
                        shot.refImage = upload.url;
                        shot.imgUrl = upload.url; // Preview langsung
                        SceneState.update();
                        renderScenes();
                    } catch (e) { alert("Upload Gagal: " + e.message); } 
                    finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
                };

                // 3. Logic Tombol
                if(isWaitingForUpload) {
                    const btnUp = document.getElementById(`btn-upload-${shot.id}`);
                    const fileIn = document.getElementById(`file-manual-${shot.id}`);
                    btnUp.addEventListener('click', () => fileIn.click());
                    fileIn.addEventListener('change', (e) => { if(e.target.files[0]) handleUpload(e.target.files[0]); });
                } else {
                    const refInput = document.getElementById(`ref-input-${shot.id}`);
                    refInput.addEventListener('change', (e) => {
                        shot.refImage = e.target.value;
                        SceneState.update();
                    });

                    // AUTO DETECT CHARACTERS (FITUR BARU)
                    const btnAuto = document.getElementById(`btn-autodetect-${shot.id}`);
                    if(btnAuto) {
                        btnAuto.addEventListener('click', () => {
                            const charState = AppState.chars;
                            if(!charState || !charState.generatedChars) { alert("Data karakter kosong di Tab 3"); return; }
                            
                            const matchedUrls = [];
                            if(shot.charsInShot) {
                                shot.charsInShot.forEach(name => {
                                    const char = charState.generatedChars.find(c => 
                                        c.name.toLowerCase().includes(name.toLowerCase()) || 
                                        name.toLowerCase().includes(c.name.toLowerCase())
                                    );
                                    if(char && char.imgbbUrl) matchedUrls.push(char.imgbbUrl);
                                });
                            }

                            if(matchedUrls.length > 0) {
                                // Gabung pakai KOMA (sesuai request)
                                const combined = matchedUrls.join(',');
                                shot.refImage = combined;
                                refInput.value = combined;
                                SceneState.update();
                                alert(`Ditemukan ${matchedUrls.length} karakter! Referensi diupdate.`);
                            } else {
                                alert("Tidak ada karakter yang cocok.");
                            }
                        });
                    }

                    // GENERATE IMAGE
                    const btnGen = document.getElementById(`btn-gen-${shot.id}`);
                    btnGen.addEventListener('click', async () => {
                        const loading = document.getElementById(`loading-${shot.id}`);
                        loading.classList.remove('hidden'); loading.classList.add('flex');
                        btnGen.disabled = true;
                        try {
                            // Ambil prompt & ref terbaru dari input UI
                            const blob = await generateShotImage(visInput.value, refInput.value);
                            const upload = await uploadToImgBB(blob, `shot_${shot.id}`);
                            shot.imgUrl = upload.url;
                            SceneState.update();
                            renderScenes();
                        } catch (e) { alert("Generate Error: " + e.message); }
                        finally { loading.classList.add('hidden'); loading.classList.remove('flex'); btnGen.disabled = false; }
                    });

                    // RE-UPLOAD MANUAL
                    const btnRe = document.getElementById(`btn-reupload-${shot.id}`);
                    const fileRe = document.getElementById(`file-reupload-${shot.id}`);
                    btnRe.addEventListener('click', () => fileRe.click());
                    fileRe.addEventListener('change', (e) => { if(e.target.files[0]) handleUpload(e.target.files[0]); });
                }
            }); // End Shot Loop
        }); // End Scene Loop
    } // End Render Function

    // EXPORT HELPERS
    window.deleteScene = (idx) => { 
        if(confirm("Hapus Scene?")) { SceneState.get().scenes.splice(idx, 1); SceneState.update(); renderScenes(); }
    };
    window.deleteShot = (sIdx, shIdx) => { 
        if(confirm("Hapus Shot?")) { SceneState.get().scenes[sIdx].shots.splice(shIdx, 1); SceneState.update(); renderScenes(); }
    };
                    }
