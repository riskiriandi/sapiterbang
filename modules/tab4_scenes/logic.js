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

    // === 1. FUNGSI LOAD NASKAH (Dibuat function biar bisa dipanggil ulang) ===
    function loadScriptData() {
        // SELALU ambil data terbaru dari State
        const storyData = AppState.story; 
        
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
            btnAutoBreakdown.disabled = false;
            
            // Update tombol breakdown biar informatif
            btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
        } else {
            scriptDisplay.innerHTML = `<div class="text-center mt-10 text-red-400">Skenario Kosong.<br><span class="text-gray-500 text-[10px]">Buat dulu di Tab 1.</span></div>`;
            btnAutoBreakdown.disabled = true;
            btnAutoBreakdown.innerHTML = `<i class="ph ph-lock-key"></i> Locked (No Script)`;
        }
    }

    // Jalankan pertama kali
    loadScriptData();
    // Render scene yang tersimpan
    renderScenes();

    // === 2. EVENT LISTENERS UTAMA ===
    
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
            // Cek data terbaru lagi
            const currentStory = AppState.story;
            if(!currentStory || !currentStory.finalScript) {
                alert("Data cerita hilang. Mohon refresh atau cek Tab 1.");
                return;
            }

            if(SceneState.get().scenes.length > 0 && !confirm("Timeline sudah ada isinya. Timpa dengan hasil baru?")) return;

            btnAutoBreakdown.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Analyzing Script...`;
            btnAutoBreakdown.disabled = true;

            try {
                // Panggil API
                const result = await breakdownScriptAI(currentStory.finalScript);
                
                // Mapping hasil AI ke format Scene kita
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
                alert("AI Director Error: " + error.message);
                console.error(error);
            } finally {
                btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
                btnAutoBreakdown.disabled = false;
            }
        });
    }

    // Tombol Tambah Manual
    if(btnAddScene) {
        btnAddScene.addEventListener('click', () => {
            const newScene = { id: Date.now(), location: "EXT. MANUAL SCENE", shots: [] };
            const scenes = SceneState.get().scenes || [];
            scenes.push(newScene);
            SceneState.update({ scenes });
            renderScenes();
        });
    }

    // === 3. RENDER ENGINE (CORE UI) ===
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
            
            // Header Scene
            sceneEl.innerHTML = `
                <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <div class="flex items-center gap-2 w-full">
                        <i class="ph ph-map-pin text-accent"></i>
                        <input type="text" class="bg-transparent border-none text-white font-bold text-sm uppercase w-full focus:outline-none focus:text-accent transition-colors" value="${scene.location}" id="loc-${scene.id}">
                    </div>
                    <button class="text-red-500 hover:text-red-400 bg-red-500/10 p-2 rounded hover:bg-red-500/20 transition-all" onclick="deleteScene(${sceneIndex})"><i class="ph ph-trash"></i></button>
                </div>
                <div class="grid grid-cols-1 gap-6" id="shots-list-${scene.id}"></div>
                
                <div class="mt-4 pt-2 border-t border-dashed border-white/10">
                    <button class="w-full py-2 bg-white/5 hover:bg-accent/20 border border-white/5 hover:border-accent/50 rounded-lg text-gray-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2" id="btn-add-shot-${scene.id}">
                        <i class="ph ph-plus-circle"></i> Add Shot to Scene
                    </button>
                </div>
            `;
            scenesContainer.appendChild(sceneEl);

            // Listener Ganti Lokasi Scene
            sceneEl.querySelector(`#loc-${scene.id}`).addEventListener('change', (e) => {
                scene.location = e.target.value;
                SceneState.update();
            });

            // Listener Tambah Shot Manual
            sceneEl.querySelector(`#btn-add-shot-${scene.id}`).addEventListener('click', () => {
                scene.shots.push({ 
                    id: Date.now(), 
                    info: "Manual Shot", 
                    visualPrompt: "Describe visual here...", 
                    actionPrompt: "Camera movement...", 
                    charsInShot: [], 
                    imgUrl: null, 
                    refImage: null 
                });
                SceneState.update();
                renderScenes();
            });

            // RENDER SHOTS DALAM SCENE
            const shotsContainer = document.getElementById(`shots-list-${scene.id}`);
            scene.shots.forEach((shot, shotIndex) => {
                
                // Logic: Cek apakah shot ini punya referensi karakter
                const isWaitingForUpload = shot.needsCrop && !shot.refImage;
                
                // Helper buat nampilin badge karakter yang terdeteksi
                let charBadges = "";
                if(shot.charsInShot && shot.charsInShot.length > 0) {
                    charBadges = shot.charsInShot.map(c => `<span class="text-[9px] bg-accent/20 text-accent px-1 rounded border border-accent/20">${c}</span>`).join(" ");
                }

                let controlArea = "";
                
                if (isWaitingForUpload) {
                    // --- STATE 1: BUTUH UPLOAD MANUAL ---
                    controlArea = `
                        <div class="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-center animate-pulse">
                            <p class="text-[10px] text-yellow-400 mb-2 font-bold flex items-center justify-center gap-2">
                                <i class="ph ph-warning-circle"></i> ${shot.cropInstruction || "Butuh Upload Manual"}
                            </p>
                            <button id="btn-upload-${shot.id}" class="w-full btn-pro bg-yellow-500 hover:bg-yellow-400 text-black text-xs py-2 justify-center font-bold">
                                <i class="ph ph-upload"></i> Upload Referensi
                            </button>
                            <input type="file" id="file-manual-${shot.id}" class="hidden" accept="image/*">
                        </div>
                    `;
                } else {
                    // --- STATE 2: SIAP GENERATE ---
                    let refLinkDisplay = "";
                    
                    // Input Link Referensi (Bisa diisi manual atau otomatis)
                    refLinkDisplay = `
                        <div class="mb-2 relative">
                            <label class="text-[9px] text-gray-400 font-bold flex justify-between">
                                <span>IMAGE REFERENCE (ImgBB / URL)</span>
                                <span class="text-accent cursor-pointer hover:underline" id="btn-autodetect-${shot.id}">Auto-Detect Char</span>
                            </label>
                            <input type="text" id="ref-input-${shot.id}" value="${shot.refImage || ''}" class="w-full bg-black/50 text-[10px] text-gray-300 p-2 rounded border border-white/10 focus:border-accent outline-none" placeholder="Kosong = Murni dari prompt">
                        </div>
                    `;

                    controlArea = `
                        ${refLinkDisplay}
                        <div class="flex gap-2">
                            <button id="btn-gen-${shot.id}" class="flex-1 btn-pro btn-pro-primary text-xs py-2 justify-center shadow-lg shadow-indigo-500/20">
                                <i class="ph ph-lightning"></i> Generate
                            </button>
                            
                            <!-- Tombol Upload Kecil -->
                            <button id="btn-reupload-${shot.id}" class="w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded hover:bg-white/10" title="Upload Gambar">
                                <i class="ph ph-upload-simple"></i>
                            </button>
                            <input type="file" id="file-reupload-${shot.id}" class="hidden" accept="image/*">
                        </div>
                    `;
                }

                const shotEl = document.createElement('div');
                shotEl.className = `flex flex-col md:flex-row gap-4 bg-black/30 p-4 rounded-lg border ${isWaitingForUpload ? 'border-yellow-500/50' : 'border-white/5'} hover:border-white/20 transition-colors`;

                shotEl.innerHTML = `
                    <!-- KOLOM KIRI: PREVIEW -->
                    <div class="w-full md:w-1/3 relative group">
                        <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                            ${shot.imgUrl 
                                ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700">` 
                                : `<div class="text-center p-4 text-gray-600 flex flex-col items-center gap-2">
                                     <i class="ph ph-image text-3xl opacity-50"></i>
                                     <p class="text-[10px] font-mono">${isWaitingForUpload ? 'WAITING UPLOAD' : 'NO IMAGE'}</p>
                                   </div>`
                            }
                            <!-- Loading Overlay -->
                            <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-20 backdrop-blur-sm">
                                <i class="ph ph-spinner animate-spin text-accent text-3xl mb-2"></i>
                                <span class="text-[10px] text-white animate-pulse font-mono">RENDERING...</span>
                            </div>
                        </div>
                        
                        ${shot.imgUrl ? `
                        <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href="${shot.imgUrl}" target="_blank" class="bg-black/60 hover:bg-accent p-1.5 rounded text-white text-xs backdrop-blur-md"><i class="ph ph-eye"></i></a>
                        </div>` : ''}
                    </div>

                    <!-- KOLOM KANAN: KONTROL -->
                    <div class="w-full md:w-2/3 flex flex-col gap-3">
                        <div class="flex justify-between items-start">
                            <div>
                                <input type="text" id="info-${shot.id}" value="${shot.info || "Shot " + (shotIndex+1)}" class="bg-transparent border-none text-yellow-400 font-bold text-xs focus:outline-none w-48" placeholder="Shot Name...">
                                <div class="flex gap-1 mt-1">${charBadges}</div>
                            </div>
                            <button class="text-red-500 text-[10px] hover:text-white hover:bg-red-500 px-2 py-1 rounded transition-colors" onclick="deleteShot(${sceneIndex}, ${shotIndex})">Hapus</button>
                        </div>
                        
                        <!-- Prompt Inputs -->
                        <div class="space-y-2">
                            <div>
                                <label class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Visual Description</label>
                                <textarea id="vis-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2.5 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none custom-scrollbar leading-relaxed">${shot.visualPrompt}</textarea>
                            </div>
                            
                            <div>
                                <label class="text-[9px] text-green-400 font-bold uppercase tracking-wider">Camera / Motion</label>
                                <textarea id="act-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2.5 rounded border border-white/10 h-10 focus:border-green-500 outline-none resize-none custom-scrollbar">${shot.actionPrompt}</textarea>
                            </div>
                        </div>

                        <!-- Action Area -->
                        <div class="pt-2 border-t border-white/5">
                            ${controlArea}
                        </div>
                    </div>
                `;
                shotsContainer.appendChild(shotEl);

                // === EVENT LISTENERS PER SHOT ===
                
                // 1. Save Text Changes
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

                // 2. Helper Upload Function
                const handleUpload = async (file) => {
                    const loading = document.getElementById(`loading-${shot.id}`);
                    loading.classList.remove('hidden'); loading.classList.add('flex');
                    try {
                        const upload = await uploadToImgBB(file, `ref_${shot.id}`);
                        shot.refImage = upload.url; // Simpan link
                        shot.imgUrl = upload.url;   // Preview langsung
                        SceneState.update();
                        renderScenes(); // Refresh UI
                    } catch (e) { alert("Upload Gagal: " + e.message); } 
                    finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
                };

                // 3. Logic Tombol
                if (isWaitingForUpload) {
                    // Mode Upload Wajib
                    document.getElementById(`btn-upload-${shot.id}`).addEventListener('click', () => document.getElementById(`file-manual-${shot.id}`).click());
                    document.getElementById(`file-manual-${shot.id}`).addEventListener('change', (e) => { if(e.target.files[0]) handleUpload(e.target.files[0]); });
                } else {
                    // Mode Generate
                    const refInput = document.getElementById(`ref-input-${shot.id}`);
                    
                    // Listener manual edit link referensi
                    refInput.addEventListener('change', (e) => {
                        shot.refImage = e.target.value;
                        SceneState.update();
                    });

                    // TOMBOL AUTO-DETECT CHARACTERS (Fitur Baru)
                    const btnAutoDetect = document.getElementById(`btn-autodetect-${shot.id}`);
                    if(btnAutoDetect) {
                        btnAutoDetect.addEventListener('click', () => {
                            // Cek apakah Tab 3 ada datanya
                            const charState = AppState.chars;
                            if(!charState || !charState.generatedChars || charState.generatedChars.length === 0) {
                                alert("Belum ada karakter di Tab 3 (Casting).");
                                return;
                            }

                            const matchedUrls = [];
                            // Cek nama karakter di dalam shot.charsInShot
                            if (shot.charsInShot && shot.charsInShot.length > 0) {
                                shot.charsInShot.forEach(charName => {
                                    // Cari yang namanya mirip
                                    const charData = charState.generatedChars.find(c => 
                                        c.name.toLowerCase().includes(charName.toLowerCase()) || 
                                        charName.toLowerCase().includes(c.name.toLowerCase())
                                    );
                                    if (charData && charData.imgbbUrl) {
                                        matchedUrls.push(charData.imgbbUrl);
                                        console.log(`Found char: ${charName} -> ${charData.imgbbUrl}`);
                                    }
                                });
                            }

                            if (matchedUrls.length > 0) {
                                const newRef = matchedUrls.join(',');
                                shot.refImage = newRef;
  
