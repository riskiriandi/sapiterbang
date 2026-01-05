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

    // 1. LOAD DATA DARI TAB 1
    const storyData = AppState.story;
    
    // Tampilkan Naskah
    if (storyData && storyData.script) {
        scriptDisplay.innerText = storyData.script;
    } else {
        scriptDisplay.innerHTML = `<span class="text-red-400">Naskah kosong. Generate di Tab 1 dulu.</span>`;
        btnAutoBreakdown.disabled = true;
    }

    // === FITUR BARU: SENSOR PERUBAHAN CERITA ===
    checkStoryUpdate();

    function checkStoryUpdate() {
        const savedState = SceneState.get();
        const currentStorySign = storyData.rawIdea || "No Story"; // Kita pake Ide Kasar sebagai tanda tangan
        
        // Cek: Apakah ada scene lama TAPI ceritanya udah beda?
        if (savedState.scenes.length > 0 && savedState.storySignature !== currentStorySign) {
            // Munculin Alert Banner di atas Timeline
            const alertDiv = document.createElement('div');
            alertDiv.className = "bg-yellow-500/20 border border-yellow-500 text-yellow-200 p-4 rounded-xl mb-6 flex justify-between items-center animate-pulse";
            alertDiv.innerHTML = `
                <div>
                    <strong class="block text-sm"><i class="ph ph-warning-circle"></i> CERITA BARU TERDETEKSI!</strong>
                    <span class="text-xs">Timeline ini masih pake data cerita lama. Mau di-update?</span>
                </div>
                <button id="btn-force-update" class="bg-yellow-500 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-yellow-400">
                    Reset & Update Timeline
                </button>
            `;
            
            // Sisipkan di atas container scene
            scenesContainer.parentElement.insertBefore(alertDiv, scenesContainer);

            // Logic Tombol Reset
            document.getElementById('btn-force-update').addEventListener('click', () => {
                if(confirm("Yakin? Semua gambar shot lama akan dihapus.")) {
                    SceneState.update({ 
                        scenes: [], 
                        storySignature: currentStorySign // Update tanda tangan jadi yang baru
                    });
                    alertDiv.remove(); // Hapus alert
                    renderScenes(); // Kosongkan timeline
                    
                    // Opsional: Langsung trigger breakdown otomatis
                    // btnAutoBreakdown.click(); 
                }
            });
        }
    }

    // 2. RENDER SCENES
    renderScenes();

    // 3. AUTO BREAKDOWN (AI DIRECTOR)
    btnAutoBreakdown.addEventListener('click', async () => {
        if(SceneState.get().scenes.length > 0) {
            if(!confirm("Timpa timeline yang ada dengan Breakdown baru?")) return;
        }

        btnAutoBreakdown.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Director is working...`;
        btnAutoBreakdown.disabled = true;

        try {
            // Panggil AI
            const result = await breakdownScriptAI(storyData.script);
            
            const newScenes = result.scenes.map((s, i) => ({
                id: Date.now() + i,
                location: s.location,
                shots: s.shots.map((sh, j) => ({
                    id: Date.now() + i + j + 100,
                    info: sh.shot_info,
                    visualPrompt: sh.visual_prompt,
                    actionPrompt: sh.video_prompt,
                    charsInShot: sh.characters_in_shot || [], 
                    imgUrl: null,
                    refImage: null
                }))
            }));

            // SIMPAN STATE + SIGNATURE CERITA SAAT INI
            SceneState.update({ 
                scenes: newScenes,
                storySignature: storyData.rawIdea // Simpan tanda tangan biar sinkron
            });
            
            renderScenes();

        } catch (error) {
            alert("Gagal: " + error.message);
        } finally {
            btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
            btnAutoBreakdown.disabled = false;
        }
    });

    // 4. RENDER FUNCTION (Sama kayak sebelumnya)
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
                // LOGIC CARI URL KARAKTER (Biar selalu update dengan Tab 3 terbaru)
                const matchedUrls = [];
                const matchedNames = [];
                
                if (shot.charsInShot && shot.charsInShot.length > 0) {
                    shot.charsInShot.forEach(charName => {
                        // Kita cari REALTIME dari AppState.chars (bukan data simpanan lama)
                        const charData = AppState.chars.generatedChars.find(c => c.name.toLowerCase().includes(charName.toLowerCase()) || charName.toLowerCase().includes(c.name.toLowerCase()));
                        
                        if (charData && charData.imgbbUrl) {
                            matchedUrls.push(charData.imgbbUrl);
                            matchedNames.push(charData.name);
                        }
                    });
                }

                const charBadge = matchedNames.length > 0 
                    ? `<div class="text-[10px] text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1 mt-1"><i class="ph ph-link"></i> Linked: ${matchedNames.join(', ')}</div>`
                    : `<div class="text-[10px] text-gray-500 mt-1 italic">No character linked</div>`;

                const shotEl = document.createElement('div');
                shotEl.className = "flex flex-col md:flex-row gap-4 bg-black/30 p-3 rounded-lg border border-white/5";

                shotEl.innerHTML = `
                    <div class="w-full md:w-1/3 relative group">
                        <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                            ${shot.imgUrl 
                                ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover">` 
                                : `<div class="text-center p-4 text-gray-600"><i class="ph ph-image text-3xl mb-1"></i><p class="text-[10px]">Preview</p></div>`
                            }
                            <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                                <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                            </div>
                        </div>
                        ${shot.imgUrl ? `<a href="${shot.imgUrl}" target="_blank" class="absolute top-2 right-2 bg-black/50 p-1 rounded text-white text-xs hover:bg-accent"><i class="ph ph-eye"></i></a>` : ''}
                    </div>

                    <div class="w-full md:w-2/3 flex flex-col gap-2">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="text-[10px] font-bold text-yellow-400">${shot.info || "Shot"}</span>
                                ${charBadge}
                            </div>
                        </div>
                        <div>
                            <label class="text-[9px] text-gray-500 font-bold uppercase">Visual Prompt</label>
                            <textarea id="vis-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none custom-scrollbar">${shot.visualPrompt}</textarea>
                        </div>
                        <div>
                            <label class="text-[9px] text-green-400 font-bold uppercase">Motion Prompt</label>
                            <textarea id="act-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-12 focus:border-green-500 outline-none resize-none custom-scrollbar">${shot.actionPrompt}</textarea>
                        </div>
                        <button id="btn-gen-${shot.id}" class="btn-pro btn-pro-primary text-xs py-2 justify-center mt-auto">
                            <i class="ph ph-lightning"></i> Generate Image
                        </button>
                    </div>
                `;
                shotsContainer.appendChild(shotEl);

                // Event Listeners
                const btnGen = document.getElementById(`btn-gen-${shot.id}`);
                const visInput = document.getElementById(`vis-${shot.id}`);
                const actInput = document.getElementById(`act-${shot.id}`);

                [visInput, actInput].forEach(inp => {
                    inp.addEventListener('change', () => {
                        shot.visualPrompt = visInput.value;
                        shot.actionPrompt = actInput.value;
                        SceneState.update();
                    });
                });

                btnGen.addEventListener('click', async () => {
                    const loading = document.getElementById(`loading-${shot.id}`);
                    loading.classList.remove('hidden');
                    loading.classList.add('flex');
                    btnGen.disabled = true;

                    try {
                        let refUrls = null;
                        if (shot.refImage) {
                            refUrls = shot.refImage;
                        } else if (matchedUrls.length > 0) {
                            refUrls = matchedUrls.join(',');
                        }

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
            });
        });
    }

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
