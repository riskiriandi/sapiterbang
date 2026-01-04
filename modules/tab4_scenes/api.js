import { AppState } from '../../core/state.js';

// 1. UPLOAD KE IMGBB
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

// 2. GENERATE SHOT (Support Multi-Reference URL)
export async function generateShotImage(prompt, refImageUrls, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    const styleData = AppState.style;
    
    // Auto Ratio
    let width = 1024, height = 1024;
    if (styleData.ratio === "16:9") { width = 1280; height = 720; }
    else if (styleData.ratio === "9:16") { width = 720; height = 1280; }

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);
    
    // Base URL
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}`;
    
    // FITUR UTAMA: MULTI-REFERENCE (KOMA SEPARATED)
    // refImageUrls bisa berupa satu URL string, atau gabungan "url1,url2"
    if (refImageUrls) {
        console.log("API: Using Reference Images:", refImageUrls);
        url += `&image=${encodeURIComponent(refImageUrls)}`;
    }

    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        const response = await fetch(url, { method: 'GET', headers: headers });
        if (!response.ok) throw new Error("Gagal generate gambar.");
        return await response.blob();
    } catch (error) {
        throw error;
    }
}

// 3. SMART BREAKDOWN (OTAK BARU - DETEKSI KARAKTER)
export async function breakdownScriptAI(fullScript) {
    const apiKey = AppState.config.pollinationsKey;
    
    // Ambil Daftar Nama Karakter dari Tab 3 buat referensi AI
    const charNames = AppState.chars.generatedChars.map(c => c.name).join(', ');
    const style = AppState.style.masterPrompt || "Cinematic";

    const systemPrompt = `
    ROLE: Expert Film Director.
    TASK: Breakdown script into a Shot List.
    AVAILABLE CHARACTERS: [${charNames}]
    VISUAL STYLE: ${style}
    
    INSTRUCTIONS:
    1. Break story into Scenes and Shots.
    2. "visual_prompt": Detailed image description. INCLUDE physical descriptions.
       - IMPORTANT: Do NOT include aspect ratio terms like "wide aspect ratio", "16:9", "cinematic ratio". This is handled by camera settings.
    3. "characters_in_shot": List EXACT names of characters present in this shot (from Available Characters).
    4. "video_prompt": Camera movement description.
    
    OUTPUT JSON FORMAT:
    {
        "scenes": [
            {
                "location": "Scene 1...",
                "shots": [
                    {
                        "shot_info": "Shot 1...",
                        "visual_prompt": "Low angle shot of Kairo climbing...",
                        "video_prompt": "Camera tracking forward...",
                        "characters_in_shot": ["Kairo", "Miri"] 
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
            { role: "user", content: `SCRIPT:\n${fullScript}` }
        ],
        jsonMode: true,
        seed: 42
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log("API: Director analyzing script & characters...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST', headers: headers, body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Director Failed");
        
        const data = await response.json();
        const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("Breakdown Error:", error);
        throw error;
    }
    }
