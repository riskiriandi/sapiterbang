// MODULE: Tab 1 API (Text Generation)

export async function generateStoryAI(roughIdea) {
    // 1. Siapkan System Prompt yang Cerdas
    // Kita paksa AI output JSON biar gampang dipisah antara Naskah & Karakter
    const systemPrompt = `
    You are a professional Storyboard Scriptwriter. 
    Analyze the user's rough idea and convert it into a structured scene script.
    
    RULES:
    1. Language: INDONESIAN (Bahasa Indonesia).
    2. Format: JSON ONLY. No markdown, no intro text.
    3. Structure:
    {
        "script": "Tulis naskah deskriptif di sini. Fokus pada visual, suasana, dan aksi karakter. Hindari dialog panjang.",
        "characters": [
            "Nama: Deskripsi visual singkat (umur, pakaian, vibe)",
            "Nama: Deskripsi visual singkat"
        ]
    }
    `;

    const fullPrompt = `${systemPrompt}\n\nUSER IDEA: ${roughIdea}`;

    // 2. Tembak ke Pollinations Text API (Gratis & Cepat)
    // Kita pakai seed random biar hasilnya beda-beda tiap klik
    const seed = Math.floor(Math.random() * 10000);
    const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai&seed=${seed}&json=true`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal menghubungi AI");
        
        const text = await response.text();
        
        // 3. Bersihkan & Parsing JSON
        // Kadang AI ngasih markdown ```json ... ```, kita hapus dulu
        const cleanText = text.replace(/```json|```/g, '').trim();
        
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Story API Error:", error);
        throw new Error("Gagal generate cerita. Coba lagi.");
    }
                                     }
