// MODULE STATE: STORY (TAB 1)
const LOCAL_KEY = 'MrG_Tab1_Data';

export const StoryState = {
    data: {
        rawIdea: "",
        isDialogMode: false,
        script: "",         // Naskah Polos (String panjang)
        segmentedStory: [], // <--- INI BARU: Array of Objects { text, visual, type }
        characters: [] 
    },

    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) this.data = JSON.parse(saved);
    },

    update(payload) {
        if (payload.idea !== undefined) this.data.rawIdea = payload.idea;
        if (payload.isDialog !== undefined) this.data.isDialogMode = payload.isDialog;
        if (payload.script) this.data.script = payload.script;
        
        // Simpan Data Segmen Baru
        if (payload.segmentedStory) this.data.segmentedStory = payload.segmentedStory;

        // Simpan Karakter (Format object {name, desc})
        if (payload.characters) {
            this.data.characters = payload.characters.map(c => {
                if(typeof c === 'string') {
                    // Fallback kalau AI ngasih string
                    const [n, d] = c.split(':');
                    return { name: n.trim(), desc: d ? d.trim() : "" };
                }
                return c;
            });
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
