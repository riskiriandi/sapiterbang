// MODULE STATE: CHARACTERS (TAB 3)
const LOCAL_KEY = 'MrG_Tab3_Data';

export const CharState = {
    data: {
        selectedModel: "seedream", // Default Model
        generatedChars: [] 
        // Struktur generatedChars nanti:
        // { 
        //   name: "Nara", 
        //   finalPrompt: "...", 
        //   imgbbUrl: "https://...", 
        //   deleteUrl: "...",
        //   expiry: 123456789 
        // }
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    update(payload) {
        if (payload.model !== undefined) this.data.selectedModel = payload.model;
        
        // Logic Update Array Karakter
        if (payload.charUpdate) {
            // Cari karakter yg namanya sama, lalu update datanya
            const index = this.data.generatedChars.findIndex(c => c.name === payload.charUpdate.name);
            if (index >= 0) {
                this.data.generatedChars[index] = payload.charUpdate;
            } else {
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
    }
};
