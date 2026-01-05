import { StoryState } from './state.js';
import { generateStoryConcept, generateScreenplay } from './api.js';

export default function init() {
    // Elements
    const inputStory = document.getElementById('story-input');
    const btnGenConcept = document.getElementById('btn-gen-concept');
    const conceptResult = document.getElementById('concept-result');
    const conceptLoading = document.getElementById('concept-loading');
    
    const phase2Container = document.getElementById('phase-2-container');
    const inputDuration = document.getElementById('duration-input');
    const btnGenScript = document.getElementById('btn-gen-script');
    const scriptContainer = document.getElementById('script-result-container');
    const scriptContent = document.getElementById('script-content');
    const scriptLoading = document.getElementById('script-loading');
    const scriptTitle = document.getElementById('script-title');
    const btnNext = document.getElementById('btn-next-tab');

    // 1. LOAD DATA
    const data = StoryState.get();
    if (data.rawIdea) {
        inputStory.value = data.rawIdea;
        if (data.storyContext) {
            renderConcept(data.synopsis, data.characters);
            phase2Container.classList.remove('hidden');
        }
        if (data.finalScript && data.finalScript.length > 0) {
            renderScript(data.finalScript);
            scriptContainer.classList.remove('hidden');
            btnNext.classList.remove('hidden');
        }
    }

    // 2. GENERATE CONCEPT (FASE 1)
    btnGenConcept.addEventListener('click', async () => {
        const idea = inputStory.value.trim();
        if (!idea) return alert("Isi ide dulu!");

        conceptLoading.classList.remove('hidden');
        conceptLoading.classList.add('flex');
        btnGenConcept.disabled = true;

        try {
            const result = await generateStoryConcept(idea);
            
            // Simpan State
            StoryState.update({
                rawIdea: idea,
                synopsis: result.synopsis,
                characters: result.characters,
                storyContext: result.synopsis // Context buat fase 2
            });

            renderConcept(result.synopsis, result.characters);
            phase2Container.classList.remove('hidden'); // Buka Fase 2

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            conceptLoading.classList.add('hidden');
            conceptLoading.classList.remove('flex');
            btnGenConcept.disabled = false;
        }
    });

    // 3. GENERATE SCRIPT (FASE 2)
    btnGenScript.addEventListener('click', async () => {
        const duration = inputDuration.value;
        const data = StoryState.get(); // Ambil data karakter & cerita

        scriptContainer.classList.remove('hidden');
        scriptLoading.classList.remove('hidden');
        scriptLoading.classList.add('flex');
        btnGenScript.disabled = true;

        try {
            const result = await generateScreenplay(data.storyContext, data.characters, duration);
            
            StoryState.update({
                targetDuration: duration,
                finalScript: result.scenes // Simpan array scenes
            });

            scriptTitle.innerText = result.title || "UNTITLED";
            renderScript(result.scenes);
            btnNext.classList.remove('hidden');

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            scriptLoading.classList.add('hidden');
            scriptLoading.classList.remove('flex');
            btnGenScript.disabled = false;
        }
    });

    // 4. NEXT TAB
    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab2_style"]').click();
    });

    // --- HELPERS ---
    function renderConcept(synopsis, characters) {
        let charHtml = characters.map(c => `
            <div class="bg-white/5 p-2 rounded border border-white/10 mb-2">
                <span class="text-accent font-bold">${c.name}</span>
                <p class="text-[10px] text-gray-400 italic">${c.desc}</p>
            </div>
        `).join('');

        conceptResult.innerHTML = `
            <div class="mb-4">
                <h4 class="text-xs font-bold text-white uppercase mb-1">Sinopsis</h4>
                <p class="text-gray-300 leading-relaxed">${synopsis}</p>
            </div>
            <div>
                <h4 class="text-xs font-bold text-white uppercase mb-1">Karakter (Desain)</h4>
                ${charHtml}
            </div>
        `;
    }

    function renderScript(scenes) {
        scriptContent.innerHTML = scenes.map(s => `
            <div class="border-l-2 border-green-500/30 pl-3 py-1 hover:bg-white/5 transition-colors">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-green-400 font-bold text-xs">${s.timestamp} (${s.duration}s)</span>
                    <span class="text-[10px] text-gray-500 uppercase tracking-wider">${s.location}</span>
                </div>
                <p class="text-gray-200 mb-1">${s.visual}</p>
                <p class="text-[10px] text-gray-500 italic"><i class="ph ph-speaker-high"></i> ${s.audio}</p>
            </div>
        `).join('');
    }
                                   }
