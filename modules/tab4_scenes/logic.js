import { AppState } from '../../core/state.js';
import { SceneState } from './state.js';
import { breakdownScriptAI } from './api.js';

export default function init() {
    const scriptContainer = document.getElementById('script-source-container');
    const timelineContainer = document.getElementById('timeline-container');
    const emptyTimeline = document.getElementById('empty-timeline');
    const btnNext = document.getElementById('btn-next-tab');

    // 1. LOAD NASKAH DARI TAB 1
    loadScriptSource();

    // 2. LOAD SCENE YANG SUDAH ADA (Kalau user balik lagi)
    renderTimeline();

    // 3. NAVIGASI
    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab5_video"]').click();
    });

    // --- FUNGSI UTAMA ---

    function loadScriptSource() {
        // Ambil data segmen dari Tab 1
        const segments = AppState.story.segmentedStory || [];
        
        if (segments.length === 0) {
            scriptContainer.innerHTML = `<div class="p-4 text-red-400 text-xs text-center">Belum ada naskah. Buat di Tab 1 dulu.</div>`;
            return;
        }

        scriptContainer.innerHTML = "";
        
        segments.forEach((seg, index) => {
            const card = document.createElement('div');
            card.className = "bg-white/5 border border-white/10 p-4 rounded-lg hover:border-accent transition-all cursor-pointer group";
            card.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] font-bold text-gray-500 uppercase">${seg.type}</span>
                    <button class="btn-add-scene text-[10px] bg-accent hover:bg-accentHover text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        + Create Scene
                    </button>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed line-clamp-4">${seg.text}</p>
            `;

            // Klik tombol "+ Create Scene"
            card.querySelector('.btn-add-scene').addEventListener('click', () => {
                createNewScene(seg.text);
            });

            scriptContainer.appendChild(card);
        });
    }

    async function createNewScene(text) {
        // Buat ID unik (Timestamp)
        const sceneId = Date.now();
        
        // UI Loading Sementara
        const loadingHtml = `
            <div id="loading-${sceneId}" class="glass-panel p-6 rounded-xl border border-accent/30 animate-pulse">
                <div class="flex items-center gap-3 text-accent">
                    <i class="ph ph-spinner animate-spin text-xl"></i>
                    <span class="text-sm font-bold">AI Director sedang membedah naskah...</span>
                </div>
                <p class="text-xs text-gray-500 mt-2 ml-8">"${text.substring(0, 50)}..."</p>
            </div>
        `;
        
        if (emptyTimeline) emptyTimeline.style.display = 'none';
        timelineContainer.insertAdjacentHTML('beforeend', loadingHtml);

        try {
            // PANGGIL AI DIRECTOR (API)
            const result = await breakdownScriptAI(text);

            // Simpan ke State
            const newScene = {
                id: sceneId,
                sourceText: text,
                locationPrompt: result.location, // Master Background
                shots: result.shots // Array of shots
            };

            SceneState.addScene(newScene);

            // Hapus loading & Render ulang
            document.getElementById(`loading-${sceneId}`).remove();
            renderTimeline();

        } catch (error) {
            alert("Director Gagal: " + error.message);
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
        timelineContainer.innerHTML = ""; // Reset container (kecuali empty state)

        scenes.forEach(scene => {
            const sceneEl = document.createElement('div');
            sceneEl.className = "glass-panel p-1 rounded-xl border border-white/10 mb-8";
            
            // RENDER HEADER SCENE (LOKASI)
            let shotsHtml = scene.shots.map((shot, sIdx) => `
                <div class="flex gap-4 p-3 bg-black/20 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
                    <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                        ${sIdx + 1}
                    </div>
                    <div class="flex-grow">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase">${shot.type}</span>
                            <span class="text-[10px] font-bold text-white">${shot.subject}</span>
                        </div>
                        <p class="text-xs text-gray-400">${shot.action}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <button class="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-white" title="Edit Shot"><i class="ph ph-pencil-simple"></i></button>
                        <button class="p-1.5 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400" title="Hapus Shot"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `).join('');

            sceneEl.innerHTML = `
                <!-- SCENE HEADER (MASTER LOCATION) -->
                <div class="p-4 border-b border-white/10 bg-white/5 rounded-t-xl">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-white text-sm flex items-center gap-2">
                            <i class="ph ph-map-pin text-accent"></i> Scene Master Location
                        </h3>
                        <button class="text-xs text-red-400 hover:text-red-300" onclick="if(confirm('Hapus Scene?')) this.closest('.glass-panel').remove()">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                    <textarea class="w-full bg-black/40 text-gray-300 text-xs p-2 rounded border border-white/10 focus:border-accent outline-none resize-none h-16">${scene.locationPrompt}</textarea>
                    <p class="text-[10px] text-gray-500 mt-1 italic">*Prompt ini akan jadi background untuk semua shot di bawah.</p>
                </div>

                <!-- SHOT LIST -->
                <div class="p-4 space-y-3">
                    ${shotsHtml}
                    
                    <!-- Add Shot Manual -->
                    <button class="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-gray-500 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2">
                        <i class="ph ph-plus"></i> Tambah Shot Manual
                    </button>
                </div>
            `;

            timelineContainer.appendChild(sceneEl);
        });
    }
            }
