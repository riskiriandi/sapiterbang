import { AppState } from '../../core/state.js';

// 1. UPLOAD KE IMGBB (Tetap kita simpan buat jaga-jaga kalau mau save hasil generate)
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

// 2. GENERATE IMAGE (Sama, buat eksekusi Visual Prompt)
export async function generateShotImage(prompt, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    const styleData = AppState.style;
    
    // Auto Ratio
    let width = 1024, height = 1024;
    if (styleData.ratio === "16:9") { width = 1280; height = 720; }
    else if (styleData.ratio === "9:16") { width = 720; height = 1280; }

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);
    
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}`;
    
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

// 3. SMART BREAKDOWN (OTAK BARU - DIRECTOR MODE)
export async function breakdownScriptAI(fullScript) {
    const apiKey = AppState.config.pollinationsKey;
    
    // Ambil Data Pendukung biar Prompt-nya Akurat
    const chars = AppState.chars.generatedChars.map(c => `${c.name}: ${c.desc}`).join('\n');
    const style = AppState.style.masterPrompt || "Cinematic";

    const systemPrompt = `
    ROLE: Expert Film Director & Cinematographer.
    TASK: Breakdown the script into a Shot List for a 60s YouTube Short.
    
    INPUT DATA:
    - Characters: \n${chars}
    - Visual Style: ${style}
    
    INSTRUCTIONS:
    1. Break story into Scenes and Shots.
    2. For "visual_prompt": Write a highly detailed image generation prompt. INCLUDE the character's physical description (from Input Data) and the Style keywords. Describe lighting, angle, and background.
    3. For "video_prompt": Write a motion prompt. Describe camera movement (Pan, Zoom, Track) and specific character action.
    
    OUTPUT JSON FORMAT:
    {
        "scenes": [
            {
                "location": "Scene 1: Mountain - Day",
                "shots": [
                    {
                        "shot_info": "Shot 1 (00-04s) - Extreme Close Up",
                        "visual_prompt": "Low angle extreme close up of furry paws hitting rough grey rocks, dust flying, cinematic lighting, photorealistic 8k...",
                        "video_prompt": "Rhythmic footsteps hitting the ground, camera tracking low, dust particles floating..."
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
        console.log("API: Director is working...");
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
