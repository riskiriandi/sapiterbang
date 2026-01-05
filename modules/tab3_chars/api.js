import { AppState } from '../../core/state.js';

// 1. ANALYZE ASSETS (OTAK BARU TAB 3)
export async function analyzeAssetsAI(scriptData) {
    const apiKey = AppState.config.pollinationsKey;
    
    // Kita kirim JSON Skenario biar dia baca detail visualnya
    const scriptString = JSON.stringify(scriptData, null, 2);

    const systemPrompt = `
    ROLE: Production Designer & Prop Master.
    TASK: Analyze the Screenplay and list all VISUAL ASSETS needed for consistency.
    
    CATEGORIES TO DETECT:
    1. MAIN CHARACTERS: (e.g., Ryo, Miri) - Full body reference.
    2. SPECIFIC BODY PARTS: If a shot mentions "Close up of hand/feet/eyes", list it as a separate asset (e.g., "Ryo's Hand", "Miri's Boots").
    3. IMPORTANT PROPS: Objects that are focused on (e.g., "Torn Map", "Broken Cup").
    
    OUTPUT JSON FORMAT:
    {
        "assets": [
            {
                "name": "Ryo",
                "type": "character",
                "desc": "Full body anthropomorphic cat, brown fur, tactical vest..."
            },
            {
                "name": "Ryo's Hand (Map)",
                "type": "prop",
                "desc": "Close up of furry hand holding a torn map. Trembling fingers."
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
        console.log("API: Analyzing Assets...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST', headers: headers, body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Asset Analysis Failed");
        
        const data = await response.json();
        const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        throw error;
    }
}

// 2. GENERATE IMAGE (Sama kayak sebelumnya)
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

// 3. UPLOAD IMGBB (Sama kayak sebelumnya)
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
