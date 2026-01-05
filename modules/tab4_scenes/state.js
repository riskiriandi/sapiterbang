// MODULE STATE: SCENES (TAB 4)
const LOCAL_KEY = 'MrG_Tab4_Data';

export const SceneState = {
    data: {
        scenes: [] 
        // Struktur Scene:
        // {
        //    id: 1,
        //    location: "...",
        //    shots: [ ... ]
        // }
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) {
            try {
                this.data = JSON.parse(saved);
            } catch (e) {
                console.error("Gagal load scene data", e);
                // Kalau data rusak, reset ke default
                this.data = { scenes: [] };
            }
        }
    },

    // PERBAIKAN PENTING: Default parameter biar gak error kalau dipanggil kosongan
    update(payload = {}) {
        if (payload.scenes) {
            this.data.scenes = payload.scenes;
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
