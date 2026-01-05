import { AppState } from '../../core/state.js';

// 1. ANALYZE ASSET NEEDS (VERSI: CHARACTER PARTS ONLY)
export async function analyzePropsAI(scriptData) {
    const apiKey = AppState.config.pollinationsKey;
    const scriptString = JSON.stringify(scriptData, null, 2);
    
    // Ambil nama karakter biar AI tau siapa yang harus diperhatiin
    const charNames = AppState.story.characters.map(c => c.name).join(', ');

    const systemPrompt = `
    ROLE: Continuity Supervisor.
    TASK: Analyze the Screenplay and list SPECIFIC VISUAL REFERENCES needed for CHARACTERS only.
    CHARACTERS: ${charNames}
    
    CRITICAL FILTERING RULES:
    1. INCLUDE: Specific Body Parts mentioned in Close-Ups (e.g., "Lila's Feet", "Ryo's Hand", "Aiden's Eyes").
    2. INCLUDE: Specific Costume Details/Damage (e.g., "Aiden's Torn Shirt", "Muddy Boots").
    3. IGNORE: Generic Props that are NOT attached to a character (e.g., "Falling Cup", "Door opening", "Trees"). Let the renderer handle those.
    4. IGNORE: Standard Full Body shots (We already have the main character model).
    
    OUTPUT JSON FORMAT:
    {
        "assets": [
            {
                "name": "Lila's Hiking Boots",
                "reason": "Close up shot in Scene 1"
            },
            {
                "name": "Aiden's Trembling Hand",
                "reason": "Holding map in Scene 2"
            }
        ]
    }
    `;

    const payload = {
        model: "openai", 
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `SCREENPLAY:\n${scriptString}` }
        ],
        jsonMode: true,
        seed: 123
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log("API: Filtering Character Assets...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST', headers: headers, body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Analysis Failed");
        
        const data = await response.json();
        const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        throw error;
    }
}

// 2. GENERATE IMAGE (Sama)
export async function generateCharImage(prompt, model, width = 1024, height = 1024) {
    const apiKey = AppState.config.pollinationsKey;
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${Math.floor(Math.random() * 10000)}`;
    if (apiKey) url += `&key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal generate gambar.");
        return await response.blob();
    } catch (error) { throw error; }
}

// 3. UPLOAD IMGBB (Sama)
export async function uploadToImgBB(imageBlob, name) {
    const apiKey = AppState.config.imgbbKey;
    if (!apiKey) throw new Error("API Key ImgBB Kosong!");

    const formData = new FormData();
    formData.append("image", imageBlob, `${name}.png`);
    
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?expiration=604800&key=${apiKey}`, {
            method: "POST", body: formData
        });
        const result = await response.json();
        return { url: result.data.url };
    } catch (error) { throw error; }
}
