// Central State Management
// Berfungsi sebagai "Single Source of Truth"

const STORAGE_KEY = 'MrG_Project_Data_v2';

export const AppState = {
    // Struktur Data Default
    data: {
        story: {
            rawText: "",
            script: "",
            characters: [] // Array of names/tags
        },
        style: {
            referenceImage: null,
            prompt: "",
            ratio: "16:9"
        },
        characters: [], // Array of objects { name, imgUrl, prompt }
        scenes: []      // Array of objects { panelId, text, imgUrl }
    },

    // Load dari LocalStorage saat web dibuka
    load() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                this.data = JSON.parse(saved);
                console.log("State: Data loaded successfully.");
            } catch (e) {
                console.error("State: Corrupt data, resetting.", e);
            }
        }
    },

    // Simpan data (Panggil ini setiap ada perubahan penting)
    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        console.log("State: Auto-saved.");
    },

    // Helper untuk update bagian spesifik
    update(moduleName, payload) {
        if (this.data[moduleName]) {
            this.data[moduleName] = { ...this.data[moduleName], ...payload };
            this.save();
        } else {
            console.error(`State: Module ${moduleName} not found in state.`);
        }
    },

    // Helper untuk ambil data
    get(moduleName) {
        return this.data[moduleName] || null;
    }
};
