// CORE STATE (AGGREGATOR)
// Tugas: Menjadi pintu utama akses data antar modul

// Import State Spesialis
import { StoryState } from '../modules/tab1_story/state.js';
// Nanti import { StyleState } from '../modules/tab2_style/state.js';

const CONFIG_KEY = 'MrG_Config_Global';

export const AppState = {
    // Config Global (API Key) tetap disini karena dipakai bareng-bareng
    config: {
        imgbbKey: "",
        pollinationsKey: ""
    },

    // --- INIT SEMUA STATE ---
    load() {
        // 1. Load Config Global
        const savedConfig = localStorage.getItem(CONFIG_KEY);
        if (savedConfig) this.config = JSON.parse(savedConfig);

        // 2. Trigger Load di masing-masing Module State
        StoryState.init();
        // StyleState.init();
    },

    // --- AKSES DATA (GETTERS) ---
    // Kalau Tab 3 mau data story, dia panggil AppState.story
    get story() {
        return StoryState.get();
    },

    // --- HELPER CONFIG ---
    saveConfig() {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    },

    resetProject() {
        // Hapus data per modul
        localStorage.removeItem('MrG_Tab1_Data');
        // localStorage.removeItem('MrG_Tab2_Data');
        window.location.reload();
    }
    
export const AppState = {
    // ... config dll ...

    load() {
        // ... load config ...
        StoryState.init();
        StyleState.init(); // <--- TAMBAH INI
    },

    // ... getter story ...
    
    // Getter Style (Biar Tab 4 bisa ambil nanti)
    get style() {
        return StyleState.get();
    }
    
    // ... sisa kode ...
};
