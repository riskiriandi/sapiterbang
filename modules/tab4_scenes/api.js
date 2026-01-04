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

// 2. GENERATE SHOT (LOGIKA JIPLAK FILE TEST_DUO.HTML)
export async function generateShotImage(prompt, refImageUrls, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    const styleData = AppState.style;
    
    // A. HITUNG RASIO
    let width = 1024, height = 1024;
    if (styleData.ratio === "16:9") { width = 1280; height = 720; }
    else if (styleData.ratio === "9:16") { width = 720; height = 1280; }

    // B. SIAPKAN PROMPT (MANTRA + PROMPT USER)
    let finalPromptText = prompt;
    
    // Kalau ada gambar, tambahin mantra biar nurut
    if (refImageUrls) {
        finalPromptText = `(Strict Reference Mode). The characters MUST match the provided reference images exactly. Maintain facial features 100%. Scene: ${prompt}`;
    }

    // ENCODE PROMPT (PENTING!)
    const encodedPrompt = encodeURIComponent(finalPromptText);
    const seed = Math.floor(Math.random() * 10000);

    // C. SIAPKAN URL GAMBAR (LOGIKA TEST_DUO)
    let imageParam = "";
    if (refImageUrls) {
        // refImageUrls bisa "url1" atau "url1,url2"
        const urls = refImageUrls.split(',');
        
        // Encode satu-satu, lalu gabung koma
        const encodedUrls = urls.map(u => encodeURIComponent(u.trim())).join(',');
        
        // Tempel ke parameter image
        imageParam = `&image=${encodedUrls}`;
        console.log("API: Image Param constructed:", imageParam);
    }
    
    // D. RAKIT URL FINAL
    // Struktur: /image/PROMPT?model=...&width=...&image=URLS
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}${imageParam}`;

    // E. FETCH (GET WITH HEADER)
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log(`API: Generating...`);
        // console.log(url); // Uncomment kalau mau liat URL asli di console

        const response = await fetch(url, { method: 'GET', headers: headers });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gen Error (${response.status}): ${errText}`);
        }
        
        return await response.blob();

    } catch (error) {
        console.error("Generate Shot Error:", error);
        throw error;
    }
}

// 3. SMART BREAKDOWN (SAMA KEK SEBELUMNYA - BIAR GAK ERROR MISSING EXPORT)
export async function breakdownScriptAI(fullScript) {
    const apiKey = AppState.config.pollinationsKey;
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
       - IMPORTANT: Do NOT include aspect ratio terms like "wide aspect ratio", "16:9".
    3. "characters_in_shot": List EXACT names of characters present in this shot.
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
