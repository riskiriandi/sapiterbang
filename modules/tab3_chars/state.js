// MODULE STATE: CHARACTERS (TAB 3)
const LOCAL_KEY = 'MrG_Tab3_Data';

export const CharState = {
    data: {
        selectedModel: "seedream", // Default sesuai request lu
        generatedChars: [] 
        // Struktur: { name: "Nara", prompt: "...", imgbbUrl: "...", deleteUrl: "..." }
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    update(payload) {
        if (payload.model !== undefined) this.data.selectedModel = payload.model;
        
        // Logic Update/Insert Karakter
        if (payload.charUpdate) {
            const index = this.data.generatedChars.findIndex(c => c.name === payload.charUpdate.name);
            if (index >= 0) {
                // Update data yang ada
                this.data.generatedChars[index] = { ...this.data.generatedChars[index], ...payload.charUpdate };
            } else {
                // Karakter baru
                this.data.generatedChars.push(payload.charUpdate);
            }
        }

        this.save();
    },

    save() {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    },

    get() {
        return this.data;
    },

    // Helper: Ambil data gambar karakter tertentu
    getCharImage(name) {
        const char = this.data.generatedChars.find(c => c.name === name);
        return char ? char.imgbbUrl : null;
    }
};
