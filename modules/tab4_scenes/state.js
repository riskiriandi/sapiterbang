// MODULE STATE: STORY (TAB 1)
const LOCAL_KEY = 'MrG_Tab1_Data';

export const StoryState = {
    data: {
        rawIdea: "",
        storyContext: "",   // Cerita Utuh (Novel Style)
        characters: [],     // Data Karakter (Nama, Deskripsi Fisik)
        targetDuration: 60, // Default 60 detik
        finalScript: []     // Naskah Skenario dengan Timestamp
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    update(payload) {
        // Update parsial (hanya yang dikirim)
        this.data = { ...this.data, ...payload };
        this.save();
    },

    save() {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    },

    get() {
        return this.data;
    }
};
