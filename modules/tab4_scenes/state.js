// MODULE STATE: SCENES (TAB 4)
const LOCAL_KEY = 'MrG_Tab4_Data';

export const SceneState = {
    data: {
        scenes: [] 
        // Struktur Data:
        // [
        //   {
        //     id: 1712345678, (Timestamp ID)
        //     sourceText: "Ryo berjalan...",
        //     locationPrompt: "Interior gudang tua...",
        //     shots: [
        //       { type: "WIDE", subject: "Ryo", action: "Berjalan", focus: "Full Body" },
        //       { type: "MACRO", subject: "Kaki", action: "Injak kaca", focus: "Boots detail" }
        //     ]
        //   }
        // ]
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    // Tambah Scene Baru
    addScene(sceneObj) {
        this.data.scenes.push(sceneObj);
        this.save();
    },

    // Update Scene (Misal ganti lokasi)
    updateScene(id, newData) {
        const index = this.data.scenes.findIndex(s => s.id === id);
        if (index >= 0) {
            this.data.scenes[index] = { ...this.data.scenes[index], ...newData };
            this.save();
        }
    },

    // Hapus Scene
    deleteScene(id) {
        this.data.scenes = this.data.scenes.filter(s => s.id !== id);
        this.save();
    },

    save() {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    },

    get() {
        return this.data.scenes;
    }
};
