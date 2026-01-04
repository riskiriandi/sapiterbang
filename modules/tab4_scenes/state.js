// MODULE STATE: SCENES (TAB 4)
const LOCAL_KEY = 'MrG_Tab4_Data';

export const SceneState = {
    data: {
        scenes: [] 
        // Struktur Scene:
        // {
        //    id: 1,
        //    locationPrompt: "Kitchen, night time...",
        //    shots: [
        //       { 
        //         id: 1, 
        //         type: "master", 
        //         visualPrompt: "...", 
        //         actionPrompt: "...", 
        //         imgbbUrl: "...",
        //         referenceImage: "..." (URL Screenshot yg diupload user)
        //       }
        //    ]
        // }
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    // Fungsi nambah scene/shot, update prompt, simpan gambar
    update(payload) {
        // Logic update state yang fleksibel (mirip Tab 3)
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
