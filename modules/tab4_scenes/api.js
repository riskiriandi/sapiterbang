import { AppState } from '../../core/state.js';

// 1. UPLOAD KE IMGBB (Tetap sama, ini udah bener)
export async function uploadToImgBB(file, name) {
    const apiKey = AppState.config.imgbbKey;
    if (!apiKey) throw new Error("API Key ImgBB Kosong!");

    const formData = new FormData();
    formData.append("image", file, name);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?expiration=604800&key=${apiKey}`, {
            method: "POST", body: formData
        });
        const result = await response.json();
        return { url: result.data.url, deleteUrl: result.data.delete_url };
    } catch (error) {
        throw error;
    }
}

// 2. GENERATE SHOT (LOGIKA MURNI SEPERTI FILE TEST)
export async function generateShotImage(prompt, refImageUrls, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    const styleData = AppState.style;
    
    // Auto Ratio (Tetap perlu biar ukuran pas)
    let width = 1024, height = 1024;
    if (styleData.ratio === "16:9") { width = 1280; height = 720; }
    else if (styleData.ratio === "9:16") { width = 720; height = 1280; }

    // === BAGIAN INI JIPLAK FILE TEST ===
    
    // 1. Encode Prompt (Tanpa dipotong, Tanpa ditambah mantra)
    const encodedPrompt = encodeURIComponent(prompt);
    
    // 2. Encode Image (Persis cara lu: encode satu-satu, gabung koma)
    let imageParam = "";
    if (refImageUrls) {
        // refImageUrls bisa string satu url atau banyak dipisah koma
        const urls = refImageUrls.split(',');
        // Trim spasi jaga-jaga, lalu encode
        const encodedUrls = urls.map(u => encodeURIComponent(u.trim())).join(',');
        
        imageParam = `&image=${encodedUrls}`;
    }

    const seed = Math.floor(Math.random() * 10000);

    // 3. Rakit URL (Struktur sama persis dengan file test)
    // enhance=false biar AI nurut sama gambar, bukan "mempercantik" sendiri
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}${imageParam}`;

    // 4. Fetch (GET dengan Header Auth)
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log(`API: Requesting Raw URL...`);
        // console.log(url); // Buka ini kalau mau liat URL aslinya di console

        const response = await fetch(url, { method: 'GET', headers: headers });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gen Error (${response.status}): ${errText}`);
        }
        
        return await response.blob();

    } catch (error) {
        throw error;
    }
}

// 3. SMART BREAKDOWN (Director Tetap Pintar)
// Bagian ini gak ngaruh ke generate gambar, cuma buat nulis teks awal.
export async function breakdownScriptAI(screenplayData) {
    const apiKey = AppState.config.pollinationsKey;
    const scriptString = JSON.stringify(screenplayData, null, 2);
    const charNames = AppState.chars.generatedChars.map(c => c.name).join(', ');
    const style = AppState.style.masterPrompt || "Cinematic";

    const systemPrompt = `
    ROLE: Expert Film Director.
    TASK: Convert SCREENPLAY into Shot List.
    AVAILABLE CHARACTERS: [${charNames}]
    VISUAL STYLE: ${style}
    
    INSTRUCTIONS:
    1. Break story into Scenes and Shots.
    2. "visual_prompt": Write a CLEAR visual description.
       - IMPORTANT: If it's a specific body part shot (e.g. feet), DESCRIBE THE CLOTHING/TEXTURE (e.g. "Black boots on wet rock"). Don't just say "Feet".
    3. "characters_in_shot": List names.
    4. "video_prompt": Camera movement.
    
    OUTPUT JSON FORMAT:
    {
        "scenes": [
            {
                "location": "Scene 1...",
                "shots": [
                    {
                        "shot_info": "Shot 1...",
                        "visual_prompt": "...",
                        "video_prompt": "...",
                        "characters_in_shot": ["Name"],
                        "needs_manual_crop": false,
                        "crop_instruction": ""
                    }
                ]
            }
        ]
    }
    `;

    const payload = {
        model: "openai", 
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `SCREENPLAY DATA:\n${scriptString}` }
        ],
        jsonMode: true,
        seed: 42
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST', headers: headers, body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Director Failed");
        const data = await response.json();
        const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        throw error;
    }
        }
