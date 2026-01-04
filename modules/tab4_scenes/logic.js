import { AppState } from '../../core/state.js';
import { SceneState } from './state.js';
import { breakdownScriptAI } from './api.js';

export default function init() {
    const scriptContainer = document.getElementById('script-source-container');
    const timelineContainer = document.getElementById('timeline-container');
    const emptyTimeline = document.getElementById('empty-timeline');
    const btnNext = document.getElementById('btn-next-tab');
    
    // Toggle Buttons
    const btnShorts = document.getElementById('mode-shorts');
    const btnCine = document.getElementById('mode-cine');
    let currentMode = 'shorts'; // Default

    // 1. SETUP TOGGLE
    btnShorts.addEventListener('click', () => setMode('shorts'));
    btnCine.addEventListener('click', () => setMode('cine'));

    function setMode(mode) {
        currentMode = mode;
        if(mode === 'shorts') {
            btnShorts.className = "px-3 py-1.5 rounded-md text-xs font-bold text-white bg-accent shadow-lg transition-all";
            btnCine.className = "px-3 py-1.5 rounded-md text-xs font-bold text-gray-400 hover:text-white transition-all";
        } else {
            btnShorts.className = "px-3 py-1.5 rounded-md text-xs font-bold text-gray-400 hover:text-white transition-all";
            btnCine.className = "px-3 py-1.5 rounded-md text-xs font-bold text-white bg-accent shadow-lg transition-all";
        }
    }

    // 2. LOAD DATA
    loadScriptSource();
    renderTimeline();

    // 3. NAVIGASI
    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab5_video"]').click();
    });

    // --- FUNGSI UTAMA ---

    function loadScriptSource() {
        const segments = AppState.story.segmentedStory || [];
        scriptContainer.innerHTML = "";
        
        if (segments.length === 0) {
            scriptContainer.innerHTML = `<div class="p-4 text-red-400 text-xs text-center">Naskah kosong.</div>`;
            return;
        }

        segments.forEach((seg) => {
            const card = document.createElement('div');
            card.className = "bg-white/5 border border-white/10 p-4 rounded-lg hover:border-accent transition-all cursor-pointer group mb-3";
            card.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">${seg.type}</span>
                    <button class="btn-breakdown text-[10px] bg-white/10 hover:bg-accent text-white px-3 py-1 rounded transition-colors flex items-center gap-1">
                        <i class="ph ph-scissors"></i> Breakdown
                    </button>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed line-clamp-3 font-serif">${seg.text}</p>
            `;

            card.querySelector('.btn-breakdown').addEventListener('click', () => {
                createNewScene(seg.text);
            });

            scriptContainer.appendChild(card);
        });
    }

    async function createNewScene(text) {
        const sceneId = Date.now();
        
        // UI Loading (Ala Script)
        const loadingHtml = `
            <div id="loading-${sceneId}" class="bg-black/40 border border-accent/30 p-6 rounded-xl animate-pulse font-mono">
                <p class="text-accent text-xs mb-2">> SYSTEM: ANALYZING NARRATIVE FLOW...</p>
                <p class="text-gray-500 text-xs">"${text.substring(0, 40)}..."</p>
            </div>
        `;
        
        if (emptyTimeline) emptyTimeline.style.display = 'none';
        timelineContainer.insertAdjacentHTML('beforeend', loadingHtml);

        try {
            const result = await breakdownScriptAI(text, currentMode);

            const newScene = {
                id: sceneId,
                sourceText: text,
                locationPrompt: result.location_prompt,
                shots: result.shots
            };

            SceneState.addScene(newScene);
            document.getElementById(`loading-${sceneId}`).remove();
            renderTimeline();

        } catch (error) {
            alert("Gagal: " + error.message);
            document.getElementById(`loading-${sceneId}`).remove();
        }
    }

    function renderTimeline() {
        const scenes = SceneState.get();
        
        if (scenes.length === 0) {
            if(emptyTimeline) emptyTimeline.style.display = 'block';
            timelineContainer.innerHTML = "";
            timelineContainer.appendChild(emptyTimeline);
            return;
        }

        if(emptyTimeline) emptyTimeline.style.display = 'none';
        timelineContainer.innerHTML = ""; 

        scenes.forEach((scene, index) => {
            const sceneEl = document.createElement('div');
            sceneEl.className = "bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden mb-8 shadow-2xl";
            
            // 1. SCENE HEADER (INT. LOCATION)
            const headerHtml = `
                <div class="bg-[#252525] p-3 border-b border-white/5 flex justify-between items-center">
                    <div class="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest">
                        SCENE ${index + 1} - ${scene.locationPrompt.substring(0, 30).toUpperCase()}...
                    </div>
                    <button class="text-gray-500 hover:text-red-400 transition-colors" onclick="if(confirm('Hapus Scene?')) this.closest('.bg-\\[#1a1a1a\\]').remove()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <!-- Location Prompt Editor -->
                <div class="p-3 bg-black/20 border-b border-white/5">
                    <label class="text-[9px] text-gray-600 font-bold uppercase block mb-1">MASTER LOCATION PROMPT (ANCHOR):</label>
                    <textarea class="w-full bg-transparent text-gray-400 text-xs font-mono focus:outline-none resize-none h-10">${scene.locationPrompt}</textarea>
                </div>
            `;

            // 2. SHOT LIST (SCREENPLAY FORMAT)
            let shotsHtml = scene.shots.map((shot, sIdx) => {
                // Tanda Linked/Continuation
                const linkBadge = shot.is_linked 
                    ? `<span class="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 ml-2">🔗 LINKED (Use Prev End-Frame)</span>` 
                    : '';

                return `
                <div class="p-4 border-b border-white/5 hover:bg-white/5 transition-colors group relative">
                    <div class="flex justify-between items-start mb-1">
                        <div class="flex items-center">
                            <span class="text-accent font-bold text-xs mr-3">SHOT ${sIdx + 1}</span>
                            <span class="text-gray-500 text-[10px] uppercase tracking-wider font-bold">${shot.type}</span>
                            ${linkBadge}
                        </div>
                        <span class="text-gray-600 text-[10px] font-mono">${shot.duration}s</span>
                    </div>
                    
                    <!-- ACTION -->
                    <div class="pl-10">
                        <p class="text-white text-sm font-serif leading-relaxed">${shot.action}</p>
                        
                        <!-- CAMERA INSTRUCTION -->
                        <div class="mt-2 flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                            <i class="ph ph-video-camera"></i>
                            <span>${shot.camera}</span>
                            <span class="mx-1">•</span>
                            <span>Subject: ${shot.subject}</span>
                        </div>
                    </div>

                    <!-- TOOLS (Edit/Delete) -->
                    <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button class="p-1 hover:text-white text-gray-600"><i class="ph ph-pencil-simple"></i></button>
                    </div>
                </div>
                `;
            }).join('');

            sceneEl.innerHTML = headerHtml + `<div class="divide-y divide-white/5">${shotsHtml}</div>`;
            timelineContainer.appendChild(sceneEl);
        });
    }
                                                                  }
