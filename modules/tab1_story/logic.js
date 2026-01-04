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
    // ... kode atas tetap sama ...

    // --- RENDER BARU (LEBIH BERSIH) ---
    function renderResult(segments, characters) {
        if(!emptyState || !contentArea || !outputScript || !outputChars) return;

        emptyState.classList.add('hidden');
        contentArea.classList.remove('hidden');
        
        outputScript.innerHTML = "";
        
        segments.forEach((seg, index) => {
            // Style Card yang lebih "Flowing"
            const div = document.createElement('div');
            div.className = "mb-6 relative group"; // Jarak antar paragraf lebih lega
            
            // Teks Cerita (Utama)
            const textHtml = `
                <p class="text-gray-200 leading-relaxed font-serif text-base text-justify">
                    ${seg.text}
                </p>
            `;

            // Visual Note (Hanya muncul kecil/samar, biar gak ganggu baca)
            const visualHtml = `
                <div class="mt-2 pl-3 border-l-2 border-accent/30 text-[10px] text-gray-500 font-mono group-hover:text-accent transition-colors">
                    <span class="uppercase font-bold opacity-50">Visual Cue:</span> ${seg.visual_note}
                </div>
            `;

            div.innerHTML = textHtml + visualHtml;
            outputScript.appendChild(div);
        });

        // RENDER KARAKTER (Tetap sama)
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
