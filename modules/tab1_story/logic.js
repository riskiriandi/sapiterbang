import { AppState } from '../../core/state.js';
import { StoryState } from './state.js';
import { generateStoryAI } from './api.js';

export default function init() {
    const inputStory = document.getElementById('story-input');
    const toggleDialog = document.getElementById('toggle-dialog');
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const contentArea = document.getElementById('content-area');
    const outputScript = document.getElementById('output-script'); // Container Naskah
    const outputChars = document.getElementById('output-chars');
    const statusBadge = document.getElementById('story-status');

    // 1. LOAD DATA
    const currentData = StoryState.get(); 
    if (currentData.rawIdea && inputStory) inputStory.value = currentData.rawIdea;
    if (toggleDialog) toggleDialog.checked = currentData.isDialogMode || false;

    // Render ulang kalau ada data
    if (currentData.segmentedStory && currentData.segmentedStory.length > 0) {
        renderResult(currentData.segmentedStory, currentData.characters);
    }

    // 2. GENERATE
    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            const idea = inputStory ? inputStory.value.trim() : "";
            const useDialog = toggleDialog ? toggleDialog.checked : false;

            if (!idea) return alert("⚠️ Masukkan ide cerita dulu!");

            if(loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
                loadingOverlay.classList.add('flex');
            }
            btnGenerate.disabled = true;

            try {
                const result = await generateStoryAI(idea, useDialog);

                // Gabungkan teks segmen jadi satu naskah utuh (buat backup)
                const fullScript = result.segments.map(s => s.text).join('\n\n');

                StoryState.update({
                    idea: idea,
                    isDialog: useDialog,
                    script: fullScript,
                    segmentedStory: result.segments, // Simpan data pintar ini
                    characters: result.characters
                });

                const cleanData = StoryState.get();
                renderResult(cleanData.segmentedStory, cleanData.characters);
                
                if(statusBadge) {
                    statusBadge.classList.remove('hidden');
                    setTimeout(() => statusBadge.classList.add('hidden'), 3000);
                }

            } catch (error) {
                alert(`Error: ${error.message}`);
            } finally {
                if(loadingOverlay) {
                    loadingOverlay.classList.add('hidden');
                    loadingOverlay.classList.remove('flex');
                }
                btnGenerate.disabled = false;
            }
        });
    }

    // 3. CLEAR
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if(confirm("Hapus?")) {
                if(inputStory) inputStory.value = "";
                StoryState.update({ idea: "", script: "", segmentedStory: [], characters: [] });
                location.reload(); // Reload biar bersih
            }
        });
    }

    // --- RENDER BARU (VISUAL SEGMENT) ---
    function renderResult(segments, characters) {
        if(!emptyState || !contentArea || !outputScript || !outputChars) return;

        emptyState.classList.add('hidden');
        contentArea.classList.remove('hidden');
        
        // RENDER NASKAH (Bukan teks polos lagi, tapi KARTU SEGMEN)
        outputScript.innerHTML = "";
        
        segments.forEach((seg, index) => {
            // Warna border berdasarkan tipe
            let borderClass = "border-l-4 border-gray-600"; // Default
            if (seg.type === "ESTABLISHING") borderClass = "border-l-4 border-blue-500";
            if (seg.type === "ACTION") borderClass = "border-l-4 border-red-500";
            if (seg.type === "DIALOGUE") borderClass = "border-l-4 border-green-500";

            const div = document.createElement('div');
            div.className = `mb-4 p-3 bg-white/5 rounded-r-lg ${borderClass}`;
            div.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider opacity-50">${seg.type}</span>
                    <span class="text-[9px] text-gray-500 italic">Shot ${index + 1}</span>
                </div>
                <p class="text-sm text-gray-200 leading-relaxed font-serif mb-2">${seg.text}</p>
                <div class="bg-black/30 p-2 rounded border border-white/5">
                    <p class="text-[10px] text-accent font-mono">👁️ Visual: ${seg.visual_note}</p>
                </div>
            `;
            outputScript.appendChild(div);
        });

        // RENDER KARAKTER (Sama kayak kemarin)
        outputChars.innerHTML = "";
        characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'bg-white/5 border border-white/10 p-3 rounded-lg hover:border-accent/50 transition-colors';
            card.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
                        <i class="ph ph-user"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-white text-sm mb-1">${char.name}</h4>
                        <p class="text-xs text-gray-400 leading-relaxed font-mono text-justify">${char.desc}</p>
                    </div>
                </div>
            `;
            outputChars.appendChild(card);
        });
    }
}
