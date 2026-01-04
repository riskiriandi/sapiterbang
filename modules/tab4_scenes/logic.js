import { AppState } from '../../core/state.js';
import { SceneState } from './state.js';
import { generateShotImage, uploadToImgBB, breakdownScriptAI } from './api.js';

export default function init() {
    const scriptDisplay = document.getElementById('script-display');
    const scenesContainer = document.getElementById('scenes-container');
    const btnAutoBreakdown = document.getElementById('btn-auto-breakdown');
    const btnClear = document.getElementById('btn-clear-scenes');
    const emptyTimeline = document.getElementById('empty-timeline');

    // 1. LOAD DATA
    const storyData = AppState.story;
    if (storyData && storyData.script) {
        scriptDisplay.innerText = storyData.script;
    } else {
        scriptDisplay.innerHTML = `<span class="text-red-400">Naskah kosong.</span>`;
        btnAutoBreakdown.disabled = true;
    }

    renderScenes();

    // 2. AUTO BREAKDOWN
    btnAutoBreakdown.addEventListener('click', async () => {
        if(!confirm("AI akan membuat Shot List otomatis. Data lama ditimpa?")) return;

        btnAutoBreakdown.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Director is working...`;
        btnAutoBreakdown.disabled = true;

        try {
            // Panggil AI Director
            const result = await breakdownScriptAI(storyData.script);
            
            // Mapping Data
            const newScenes = result.scenes.map((s, i) => ({
                id: Date.now() + i,
                location: s.location,
                shots: s.shots.map((sh, j) => ({
                    id: Date.now() + i + j + 100,
                    info: sh.shot_info,
                    visualPrompt: sh.visual_prompt, // Prompt Gambar
                    actionPrompt: sh.video_prompt,  // Prompt Video
                    imgUrl: null
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

    // 3. RENDER UI
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
            
            // Render Shots
            const shotsContainer = document.getElementById(`shots-list-${scene.id}`);
            scene.shots.forEach((shot) => {
                const shotEl = document.createElement('div');
                shotEl.className = "flex flex-col md:flex-row gap-4 bg-black/30 p-3 rounded-lg border border-white/5";

                shotEl.innerHTML = `
                    <!-- KIRI: GAMBAR -->
                    <div class="w-full md:w-1/3 relative group">
                        <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                            ${shot.imgUrl 
                                ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover">` 
                                : `<div class="text-center p-4 text-gray-600"><i class="ph ph-image text-3xl mb-1"></i><p class="text-[10px]">No Image</p></div>`
                            }
                            <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                                <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                            </div>
                        </div>
                        ${shot.imgUrl ? `<a href="${shot.imgUrl}" target="_blank" class="absolute top-2 right-2 bg-black/50 p-1 rounded text-white text-xs hover:bg-accent"><i class="ph ph-eye"></i></a>` : ''}
                    </div>

                    <!-- KANAN: PROMPTS -->
                    <div class="w-full md:w-2/3 flex flex-col gap-2">
                        <div class="flex justify-between">
                            <span class="text-[10px] font-bold text-yellow-400">${shot.info || "Shot"}</span>
                        </div>

                        <!-- 1. Visual Prompt (Gambar) -->
                        <div>
                            <label class="text-[9px] text-gray-500 font-bold uppercase flex justify-between">
                                <span>Visual Prompt (Image)</span>
                                <i class="ph ph-pencil-simple"></i>
                            </label>
                            <textarea id="vis-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none custom-scrollbar">${shot.visualPrompt}</textarea>
                        </div>

                        <!-- 2. Video Prompt (Gerakan) -->
                        <div>
                            <label class="text-[9px] text-green-400 font-bold uppercase flex justify-between">
                                <span>Motion Prompt (Video)</span>
                                <i class="ph ph-video-camera"></i>
                            </label>
                            <textarea id="act-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-12 focus:border-green-500 outline-none resize-none custom-scrollbar">${shot.actionPrompt}</textarea>
                        </div>

                        <!-- Generate Button -->
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

                // Auto Save Text Change
                [visInput, actInput].forEach(inp => {
                    inp.addEventListener('change', () => {
                        shot.visualPrompt = visInput.value;
                        shot.actionPrompt = actInput.value;
                        SceneState.update();
                    });
                });

                // Generate Image
                btnGen.addEventListener('click', async () => {
                    const loading = document.getElementById(`loading-${shot.id}`);
                    loading.classList.remove('hidden');
                    loading.classList.add('flex');
                    btnGen.disabled = true;

                    try {
                        const blob = await generateShotImage(visInput.value);
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

    // Delete Helper
    window.deleteScene = (idx) => {
        if(confirm("Hapus Scene?")) {
            const scenes = SceneState.get().scenes;
            scenes.splice(idx, 1);
            SceneState.update({ scenes });
            renderScenes();
        }
    };
    
    // Clear All
    btnClear.addEventListener('click', () => {
        if(confirm("Reset semua timeline?")) {
            SceneState.update({ scenes: [] });
            renderScenes();
        }
    });
            }
