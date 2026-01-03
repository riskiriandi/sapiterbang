// core/state.js
// MANAGER DATA PUSAT (DENGAN 2 LACI PENYIMPANAN)

const KEYS = {
    PROJECT: 'MrG_Project_v2', // Data Cerita (Bisa di-reset)
    CONFIG: 'MrG_Config_v1'    // API Keys (Tetap disimpan)
};

export const AppState = {
    // Laci 1: Data Project (Input User)
    project: {
        story: { raw: "", script: "", chars: [] },
        style: { url: "", prompt: "", ratio: "16:9" },
        characters: [],
        scenes: [],
        video: null
    },

    // Laci 2: Konfigurasi (API Key)
    config: {
        imgbbKey: "",
        pollinationsKey: "" // Opsional
    },

    // --- FUNGSI LOAD (Dipanggil saat web dibuka) ---
    load() {
        // Load Config (API Key)
        const savedConfig = localStorage.getItem(KEYS.CONFIG);
        if (savedConfig) this.config = JSON.parse(savedConfig);

        // Load Project (Cerita terakhir)
        const savedProject = localStorage.getItem(KEYS.PROJECT);
        if (savedProject) {
            this.project = JSON.parse(savedProject);
            console.log("State: Project data restored.");
        } else {
            console.log("State: New project started.");
        }
    },

    // --- FUNGSI SAVE (Dipanggil tiap user ngetik/generate) ---
    saveProject() {
        localStorage.setItem(KEYS.PROJECT, JSON.stringify(this.project));
        console.log("State: Project Auto-saved.");
    },

    saveConfig() {
        localStorage.setItem(KEYS.CONFIG, JSON.stringify(this.config));
        console.log("State: Config Saved.");
    },

    // --- FUNGSI RESET (Hanya hapus project, API Key aman) ---
    resetProject() {
        this.project = {
            story: { raw: "", script: "", chars: [] },
            style: { url: "", prompt: "", ratio: "16:9" },
            characters: [],
            scenes: [],
            video: null
        };
        this.saveProject();
        window.location.reload(); // Reload biar bersih
    },

    // --- VALIDATOR (Satpam Tab) ---
    // Cek apakah user boleh masuk ke tab tertentu?
    canEnterTab(tabName) {
        // Tab 1 selalu boleh
        if (tabName === 'tab1_story') return true;

        // Mau ke Tab 2? Cek Tab 1 (Harus ada Script)
        if (tabName === 'tab2_style') {
            return this.project.story.script.length > 10; 
        }

        // Mau ke Tab 3? Cek Tab 2 (Harus ada Style Prompt)
        if (tabName === 'tab3_chars') {
            return this.project.style.prompt.length > 5;
        }

        // Mau ke Tab 4? Cek Tab 3 (Harus ada minimal 1 karakter)
        if (tabName === 'tab4_scenes') {
            return this.project.characters.length > 0;
        }

        // Mau ke Tab 5? Cek Tab 4 (Harus ada Scene)
        if (tabName === 'tab5_video') {
            return this.project.scenes.length > 0;
        }

        return false;
    }
};
