// MODULE STATE: SCENES (TAB 4)
const LOCAL_KEY = 'MrG_Tab4_Data';

export const SceneState = {
    data: {
        scenes: [],
        storySignature: "" // <--- FITUR BARU: Buat nyatet judul/ide cerita terakhir
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) {
            try {
                this.data = JSON.parse(saved);
            } catch (e) {
                console.error("Gagal load scene data", e);
                this.data = { scenes: [], storySignature: "" };
            }
        }
    },

    update(payload = {}) {
        if (payload.scenes) this.data.scenes = payload.scenes;
        if (payload.storySignature) this.data.storySignature = payload.storySignature; // <--- SIMPAN SIGNATURE
        
        this.save();
    },

    save() {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    },

    get() {
        return this.data;
    }
};
