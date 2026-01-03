import { AppState } from '../../core/state.js';
import { generateStoryAI } from './api.js';

export default function init() {
    // 1. Ambil Elemen DOM
    const inputStory = document.getElementById('story-input');
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    const btnNext = document.getElementById('btn-next');
    
    const resultContainer = document.getElementById('result-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const contentArea = document.getElementById('content-area');
    
    const outputScript = document.getElementById('output-script');
    const outputChars = document.getElementById('output-chars');
    const actionBar = document.getElementById('action-bar');
    const statusBadge = document.getElementById('story-status');

    // 2. Load Data Lama (Kalau ada)
    // Cek apakah user pernah ngisi sebelumnya?
    if (AppState.project.story.raw) {
        inputStory.value = AppState.project.story.raw;
        
        // Kalau script juga ada, tampilkan langsung
        if (AppState.project.story.script) {
            renderResult(AppState.project.story.script, AppState.project.story.chars);
        }
    }

    // 3. Event Listener: Generate
    btnGenerate.addEventListener('click', async () => {
        const idea = inputStory.value.trim();
        
        if (!idea) {
            alert("⚠️ Tulis ide ceritamu dulu!");
            inputStory.focus();
            return;
        }

        // UI: Loading State
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Generating...`;

        try {
            // CALL API
            const result = await generateStoryAI(idea);
            
            // SIMPAN KE STATE
            AppState.project.story.raw = idea;
            AppState.project.story.script = result.script;
            AppState.project.story.chars = result.characters; // Array string
            AppState.saveProject();

            // RENDER HASIL
            renderResult(result.script, result.characters);

            // Tampilkan Notif Sukses
            statusBadge.classList.remove('hidden');

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            // UI: Reset Loading
            loadingOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('flex');
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = `<i class="ph ph-magic-wand text-lg"></i><span>Generate Script & Casting</span>`;
        }
    });

    // 4. Event Listener: Clear
    btnClear.addEventListener('click', () => {
        if(confirm("Hapus tulisan?")) inputStory.value = "";
    });

    // 5. Event Listener: Next Tab
    btnNext.addEventListener('click', () => {
        // Pindah ke Tab 2 via klik tombol navigasi di atas (simulasi klik)
        document.querySelector('button[data-target="tab2_style"]').click();
    });

    // --- HELPER FUNCTIONS ---

    function renderResult(script, characters) {
        // Sembunyikan Empty State, Munculkan Content
        emptyState.classList.add('hidden');
        contentArea.classList.remove('hidden');

        // Isi Teks Script
        outputScript.innerText = script;

        // Isi Tags Karakter
        outputChars.innerHTML = "";
        characters.forEach(char => {
            const tag = document.createElement('div');
            tag.className = 'char-tag';
            // Pecah Nama dan Deskripsi (Biasanya format "Nama: Deskripsi")
            const [name, desc] = char.split(':');
            
            tag.innerHTML = `
                <i class="ph ph-user"></i>
                <span class="font-bold text-accent">${name || char}</span>
                <span class="text-gray-500 text-[10px] truncate max-w-[150px]">${desc || ''}</span>
            `;
            outputChars.appendChild(tag);
        });

        // Munculkan Tombol Next (Floating)
        actionBar.classList.add('show-action-bar');
    }
      }
