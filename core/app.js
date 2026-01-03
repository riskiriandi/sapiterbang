import { initRouter } from './router.js';
import { AppState } from './state.js';

// Fungsi Utama untuk Menyalakan Aplikasi
export function startApp() {
    console.log("System: Booting MrG Studio...");

    // 1. Load Data & Router
    AppState.load();
    initRouter();

    // 2. Jalankan Logic Modal Settings
    setupSettingsModal();
}

// Logic Mengurus Modal Settings (Dipisah biar rapi)
function setupSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const btnDesktop = document.getElementById('btn-settings-desktop');
    const btnMobile = document.getElementById('btn-settings-mobile');
    const btnClose = document.getElementById('close-settings');
    const overlay = document.getElementById('overlay-settings');
    
    // Inputs
    const inpImgbb = document.getElementById('inp-imgbb');
    const inpPolli = document.getElementById('inp-polli');
    const btnSave = document.getElementById('btn-save-config');
    const btnReset = document.getElementById('btn-reset-project');

    // Buka Modal
    function openModal() {
        // Isi input dengan data dari State
        inpImgbb.value = AppState.config.imgbbKey || "";
        inpPolli.value = AppState.config.pollinationsKey || "";
        
        modal.classList.remove('hidden');
    }

    // Tutup Modal
    function closeModal() { 
        modal.classList.add('hidden'); 
    }

    // Event Listeners (Pakai Optional Chaining ?. biar gak error kalau elemen gak ketemu)
    btnDesktop?.addEventListener('click', openModal);
    btnMobile?.addEventListener('click', openModal);
    btnClose?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);

    // Tombol Simpan Config
    btnSave?.addEventListener('click', () => {
        AppState.config.imgbbKey = inpImgbb.value.trim();
        AppState.config.pollinationsKey = inpPolli.value.trim();
        AppState.saveConfig();
        
        closeModal();
        alert("✅ API Key Tersimpan! System Ready.");
    });

    // Tombol Reset Project
    btnReset?.addEventListener('click', () => {
        if(confirm("⚠️ PERINGATAN: Semua cerita & gambar akan dihapus.\nAPI Key TETAP AMAN.\n\nYakin mau reset?")) {
            AppState.resetProject();
        }
    });
          }
