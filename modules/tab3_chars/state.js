// MODULE STATE: ASSETS & CASTING (TAB 3)
const LOCAL_KEY = 'MrG_Tab3_Data';

export const CharState = {
    data: {
        selectedModel: "seedream-pro",
        // Dulu namanya 'generatedChars', sekarang kita panggil 'assets' biar umum
        assets: [] 
        // Struktur: { 
        //   id: 123, 
        //   name: "Ryo's Hand", 
        //   type: "prop", // atau "character"
        //   desc: "Close up hand holding map...", 
        //   imgbbUrl: "..." 
        // }
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    update(payload) {
        if (payload.model) this.data.selectedModel = payload.model;
        
        if (payload.assets) {
            this.data.assets = payload.assets;
        }
        
        // Logic Update Satu Aset
        if (payload.assetUpdate) {
            const index = this.data.assets.findIndex(a => a.id === payload.assetUpdate.id);
            if (index >= 0) {
                this.data.assets[index] = { ...this.data.assets[index], ...payload.assetUpdate };
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

    // Helper buat Tab 4 nanti nyari gambar
    getAssetImage(name) {
        // Cari yang namanya mirip
        const asset = this.data.assets.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
        return asset ? asset.imgbbUrl : null;
    }
};
