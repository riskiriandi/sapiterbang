import { AppState } from '../../core/state.js';

// 1. UPLOAD KE IMGBB (Tetap sama)
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

// 2. GENERATE SHOT (Logic Prompting)
export async function generateShotImage(prompt, refImageUrls, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    const styleData = AppState.style;
    
    // Auto Ratio
    let width = 1024, height = 1024;
    if (styleData.ratio === "16:9") { width = 1280; height = 720; }
    else if (styleData.ratio === "9:16") { width = 720; height = 1280; }

    // Encode Prompt
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);

    // Image URL Logic
    let imageParam = "";
    if (refImageUrls) {
        const urls = refImageUrls.split(',');
        const encodedUrls = urls.map(u => encodeURIComponent(u.trim())).join(',');
        imageParam = `&image=${encodedUrls}`;
    }
    
    // Rakit URL
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}${imageParam}`;

    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
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

// 3. SMART BREAKDOWN (VERSI: SKENARIO READER & CROP DETECTOR)
export async function breakdownScriptAI(screenplayData) {
    const apiKey = AppState.config.pollinationsKey;
    
    // Kita kirim Data Skenario (JSON) biar AI tau durasi & adegan
    // screenplayData diambil dari AppState.story.finalScript
    const scriptString = JSON.stringify(screenplayData, null, 2);
    
    const charNames = AppState.chars.generatedChars.map(c => c.name).join(', ');
    const style = AppState.style.masterPrompt || "Cinematic";

    const systemPrompt = `
    ROLE: Expert Film Director.
    TASK: Convert the provided SCREENPLAY (JSON) into a Visual Shot List.
    AVAILABLE CHARACTERS: [${charNames}]
    VISUAL STYLE: ${style}
    
    CRITICAL INSTRUCTION - MANUAL CROP TRIGGER:
    - Analyze the visual description.
    - If the shot is an EXTREME CLOSE-UP of a specific body part (e.g., "Hand holding cup", "Feet walking", "Eye looking") AND excludes the face/body...
    - Set "needs_manual_crop": true.
    - Set "crop_instruction": "Please upload a photo of [Character]'s [Part] only."
    - This is to prevent the AI from generating a tiny full-body character.

    OUTPUT JSON FORMAT:
    {
        "scenes": [
            {
                "location": "Scene 1 Location",
                "shots": [
                    {
                        "shot_info": "Shot 1 (00:00-00:04)",
                        "visual_prompt": "Low angle close up of Kairo's boots stepping on wet rock...",
                        "video_prompt": "Camera tracking footstep...",
                        "characters_in_shot": ["Kairo"],
                        "needs_manual_crop": true,
                        "crop_instruction": "Upload crop of Kairo's Boots/Feet"
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
