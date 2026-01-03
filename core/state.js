// core/state.js
// GUDANG DATA PUSAT (INCREMENTAL BUILD)

const KEYS = {
    PROJECT: 'MrG_Project_Data_v1', // Data Cerita & Gambar
    CONFIG: 'MrG_Config_Key_v1'     // API Key
};

export const AppState = {
    // LACI 1: KONFIGURASI (API KEY)
    config: {
        imgbbKey: "",
        pollinationsKey: ""
    },

    // LACI 2: DATA PROJECT (Kita fokus struktur Tab 1 dulu)
    project: {
        // === TAB 1: STORY DATA ===
        story: {
            rawIdea: "",        // Ide kasar user
            isDialogMode: false,// Status toggle dialog
            script: "",         // Hasil naskah
            characters: []      // Array deskripsi karakter (Inggris)
        },

        // === TAB 2: STYLE DATA (Placeholder dulu) ===
        style: {
            url: "", prompt: ""
        }
        // Nanti Tab 3, 4, 5 nyusul disini...
    },

    // --- FUNGSI LOAD ---
    load() {
        // Load API Key
        const savedConfig = localStorage.getItem(KEYS.CONFIG);
        if (savedConfig) this.config = JSON.parse(savedConfig);

        // Load Project Data
        const savedProject = localStorage.getItem(KEYS.PROJECT);
        if (savedProject) {
            // Kita merge biar kalau ada struktur baru gak error
            this.project = { ...this.project, ...JSON.parse(savedProject) };
            console.log("State: Project Loaded.");
        }
    },

    // --- FUNGSI SAVE ---
    saveProject() {
        localStorage.setItem(KEYS.PROJECT, JSON.stringify(this.project));
        console.log("State: Project Saved.");
    },

    saveConfig() {
        localStorage.setItem(KEYS.CONFIG, JSON.stringify(this.config));
    },

    // --- FUNGSI RESET ---
    resetProject() {
        localStorage.removeItem(KEYS.PROJECT);
        window.location.reload();
    }
};
