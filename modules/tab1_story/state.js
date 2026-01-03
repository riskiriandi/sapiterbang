// MODULE STATE: STORY (TAB 1)
// Tugas: Mengelola, Merapikan, dan Menyimpan Data Story

const LOCAL_KEY = 'MrG_Tab1_Data';

export const StoryState = {
    // Struktur Data Default
    data: {
        rawIdea: "",
        isDialogMode: false,
        script: "",
        characters: [] // Array of Objects { name, desc }
    },

    // Load dari LocalStorage (Khusus Tab 1)
    init() {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) {
            this.data = JSON.parse(saved);
        }
    },

    // Setter: Menerima data mentah, merapikan, lalu simpan
    update(payload) {
        // 1. Update Raw Idea & Mode
        if (payload.idea !== undefined) this.data.rawIdea = payload.idea;
        if (payload.isDialog !== undefined) this.data.isDialogMode = payload.isDialog;

        // 2. Update Script
        if (payload.script) this.data.script = payload.script;

        // 3. RAPIHIN KARAKTER (Formatting Logic)
        // API ngasih array string ["Jono: Kucing", "Siti: Robot"]
        // Kita ubah jadi Array Object [{name:"Jono", desc:"Kucing"}, ...] biar enak dipake Tab 3
        if (payload.characters && Array.isArray(payload.characters)) {
            this.data.characters = payload.characters.map(charStr => {
                // Cek apakah stringnya sudah object (kalau update ulang) atau masih string mentah
                if (typeof charStr === 'object') return charStr;

                // Logic Pemecah String
                let name = "Unknown";
                let desc = charStr;

                if (charStr.includes(':')) {
                    const parts = charStr.split(':');
                    name = parts[0].trim();
                    desc = parts.slice(1).join(':').trim();
                }

                return { name, desc };
            });
        }

        // 4. Auto Save ke Browser
        this.save();
    },

    save() {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    },

    // Getter: Biar Core bisa ambil data yang sudah rapi
    get() {
        return this.data;
    }
};
