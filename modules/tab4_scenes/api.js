import { AppState } from './state.js';

// 1. UPLOAD KE IMGBB (Gak berubah, karena logika lu udah bener)
export async function uploadToImgBB(file, name) {
    const apiKey = AppState.config.imgbbKey;
    if (!apiKey) throw new Error("API Key ImgBB Kosong! Cek Settings.");

    const formData = new FormData();
    formData.append("image", file, name);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?expiration=604800&key=${apiKey}`, {
            method: "POST", body: formData
        });
        const result = await response.json();
        if(!result.success) throw new Error("ImgBB Failed: " + (result.error?.message || "Unknown error"));
        
        return { url: result.data.url, deleteUrl: result.data.delete_url };
    } catch (error) {
        throw error;
    }
}

// 2. GENERATE SHOT (REVISI TOTAL: MIRIP FILE TEST)
export async function generateShotImage(prompt, refImageUrls, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    const styleData = AppState.style;
    
    // Auto Ratio (Wajib ikut Global Setting sesuai request lu)
    let width = 1024, height = 1024;
    if (styleData && styleData.ratio === "16:9") { width = 1280; height = 720; }
    else if (styleData && styleData.ratio === "9:16") { width = 720; height = 1280; }

    // 1. Encode Prompt
    const encodedPrompt = encodeURIComponent(prompt);
    
    // 2. Encode Image (LOGIKA BARU: LEBIH PINTAR)
    // Ini menangani spasi, koma, atau enter sebagai pemisah
    let imageParam = "";
    if (refImageUrls && refImageUrls.length > 5) {
        // Regex: Pisahkan berdasarkan Koma, Spasi, atau Baris Baru
        const urls = refImageUrls.split(/[\s,]+/); 
        // Filter yang kosong, lalu encode satu-satu, gabung pakai KOMA
        const validUrls = urls.filter(u => u.trim().length > 0).map(u => encodeURIComponent(u.trim()));
        
        if (validUrls.length > 0) {
            imageParam = `image=${validUrls.join(',')}&`; 
            // Perhatikan: Gw taruh 'image=' di depan variabel, nanti ditempel di awal URL
        }
    }

    const seed = Math.floor(Math.random() * 10000);

    // 3. Rakit URL (Struktur Identik dengan File Test)
    // Urutan: /image/PROMPT?image=URLS&model=...
    // nologo=true & enhance=false (biar nurut sama gambar referensi)
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?${imageParam}model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}`;

    // 4. Fetch
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log(`API Request: ${url}`); // Cek console kalau mau liat URL final
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

// 3. SMART BREAKDOWN (Director AI)
export async function breakdownScriptAI(screenplayData) {
    const apiKey = AppState.config.pollinationsKey;
    // Safety check kalau CharState belum ready
    const charNames = (AppState.chars && AppState.chars.generatedChars) 
        ? AppState.chars.generatedChars.map(c => c.name).join(', ') 
        : "Unknown";
        
    const scriptString = JSON.stringify(screenplayData, null, 2);
    const style = (AppState.style && AppState.style.masterPrompt) ? AppState.style.masterPrompt : "Cinematic";

    const systemPrompt = `
    ROLE: Expert Film Director.
    TASK: Convert SCREENPLAY into Shot List.
    AVAILABLE CHARACTERS: [${charNames}]
    VISUAL STYLE: ${style}
    
    INSTRUCTIONS:
    1. Break story into Scenes and Shots.
    2. "visual_prompt": Write a CLEAR visual description suitable for AI Image Generator.
       - IMPORTANT: If the shot focuses on a specific body part (e.g. feet, hand), DESCRIBE THE CONTEXT (e.g. "Close up of dirty boots on wet pavement").
    3. "characters_in_shot": List names of characters present in the shot.
    4. "video_prompt": Camera movement description.
    
    OUTPUT JSON FORMAT:
    {
        "scenes": [
            {
                "location": "Scene Location...",
                "shots": [
                    {
                        "shot_info": "Wide Shot / Close Up...",
                        "visual_prompt": "...",
                        "video_prompt": "...",
                        "characters_in_shot": ["Name1", "Name2"],
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
