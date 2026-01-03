// MODULE STATE: STYLE (TAB 2)
const LOCAL_KEY = 'MrG_Tab2_Data';

export const StyleState = {
    data: {
        referenceUrl: "",   // URL Gambar (dari ImgBB atau Paste)
        masterPrompt: "",   // Hasil analisa AI (Teks)
        ratio: "16:9"       // Aspect Ratio default
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    update(payload) {
        if (payload.url !== undefined) this.data.referenceUrl = payload.url;
        if (payload.prompt !== undefined) this.data.masterPrompt = payload.prompt;
        if (payload.ratio !== undefined) this.data.ratio = payload.ratio;
        
        this.save();
    },

    save() {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    },

    get() {
        return this.data;
    }
};
