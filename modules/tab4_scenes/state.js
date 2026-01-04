// MODULE STATE: SCENES (TAB 4)
const LOCAL_KEY = 'MrG_Tab4_Data';

export const SceneState = {
    data: {
        scenes: [] 
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) {
            try {
                this.data = JSON.parse(saved);
            } catch (e) {
                console.error("Gagal load scene data", e);
            }
        }
    },

    // PERBAIKAN DISINI: Tambah parameter default "payload = {}"
    // Jadi kalau dipanggil kosongan, dia gak error.
    update(payload = {}) {
        // Cek apakah ada data scenes baru yang dikirim?
        if (payload.scenes) {
            this.data.scenes = payload.scenes;
        }
        
        // Kalau payload kosong, dia tetap lanjut nge-save data yang ada di memori
        this.save();
    },

    save() {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    },

    get() {
        return this.data;
    }
};
