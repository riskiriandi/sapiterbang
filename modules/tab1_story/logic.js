import { AppState } from '../../core/state.js';
import { StoryState } from './state.js'; // Import State Lokal
import { generateStoryAI } from './api.js';

export default function init() {
    const inputStory = document.getElementById('story-input');
    const toggleDialog = document.getElementById('toggle-dialog');
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    
    // Output Elements
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const contentArea = document.getElementById('content-area');
    const outputScript = document.getElementById('output-script');
    const outputChars = document.getElementById('output-chars');
    const statusBadge = document.getElementById('story-status');

    // 1. LOAD DATA (Ambil dari Local State lewat Core atau langsung)
    // Kita ambil lewat AppState biar konsisten, atau StoryState langsung juga boleh.
    const currentData = StoryState.get(); 

    if (currentData.rawIdea) {
        inputStory.value = currentData.rawIdea;
        toggleDialog.checked = currentData.isDialogMode;
        
        if (currentData.script) {
            renderResult(currentData.script, currentData.characters);
        }
    }

    // 2. GENERATE
    btnGenerate.addEventListener('click', async () => {
        const idea = inputStory.value.trim();
        const useDialog = toggleDialog.checked;

        if (!idea) {
            alert("⚠️ Masukkan ide cerita dulu!");
            inputStory.focus();
            return;
        }

        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
        btnGenerate.disabled = true;

        try {
            const result = await generateStoryAI(idea, useDialog);

            // --- PERUBAHAN DISINI ---
            // Kita panggil fungsi update() milik StoryState.
            // Dia yang akan ngurus formatting string -> object.
            StoryState.update({
                idea: idea,
                isDialog: useDialog,
                script: result.script,
                characters: result.characters // Masih array string dari API
            });

            // Ambil data yang sudah dirapikan oleh State
            const cleanData = StoryState.get();

            // Render pakai data yang sudah rapi
            renderResult(cleanData.script, cleanData.characters);
            
            statusBadge.classList.remove('hidden');
            setTimeout(() => statusBadge.classList.add('hidden'), 3000);

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('flex');
            btnGenerate.disabled = false;
        }
    });

    // 3. CLEAR
    btnClear.addEventListener('click', () => {
        if(confirm("Hapus?")) {
            inputStory.value = "";
            StoryState.update({ idea: "", script: "", characters: [] });
        }
    });

    // 4. TOGGLE LISTENER
    toggleDialog.addEventListener('change', () => {
        StoryState.update({ isDialog: toggleDialog.checked });
    });

    // --- RENDER ---
    function renderResult(script, characters) {
        emptyState.classList.add('hidden');
        contentArea.classList.remove('hidden');
        
        outputScript.innerText = script;

        outputChars.innerHTML = "";
        
        // Karena data 'characters' sekarang SUDAH PASTI Object {name, desc} (berkat StoryState),
        // Kita gak perlu logic split string lagi disini. UI jadi bersih!
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
