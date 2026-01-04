// CORE STATE (AGGREGATOR)
// Tugas: Menjadi pintu utama akses data antar modul

// Import State Spesialis
import { StoryState } from '../modules/tab1_story/state.js';
import { StyleState } from '../modules/tab2_style/state.js';
import { CharState } from '../modules/tab3_chars/state.js'; // <--- MEMBER BARU
import { SceneState } from '../modules/tab4_scenes/state.js';

const CONFIG_KEY = 'MrG_Config_Global';

export const AppState = {
    // Config Global (API Key)
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
        StyleState.init();
        CharState.init(); // <--- AKTIFKAN TAB 3
        SceneState.init();
        
        console.log("System: All States Loaded.");
    },

    // --- AKSES DATA (GETTERS) ---
    // Biar modul lain gampang ambil data
    get story() { return StoryState.get(); },
    get style() { return StyleState.get(); },
    get chars() { return CharState.get(); }, // <--- AKSES DATA TAB 3
    get scenes() { return SceneState.get(); }, // <--- AKSES DATA TAB 4

    
    // --- HELPER CONFIG ---
    saveConfig() {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    },

    resetProject() {
        // Hapus data per modul (Bersih-bersih total)
        localStorage.removeItem('MrG_Tab1_Data');
        localStorage.removeItem('MrG_Tab2_Data');
        localStorage.removeItem('MrG_Tab3_Data');// <--- HAPUS DATA TAB 3 JUGA
        localStorage.removeItem('MrG_Tab4_Data'); // <--- HAPUS DATA TAB 4
        
        window.location.reload();
    }
};
