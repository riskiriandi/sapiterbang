import { AppState } from '../../core/state.js';

// 1. ANALYZE PROPS ONLY (Karakter ambil dari Tab 1)
export async function analyzePropsAI(scriptData) {
    const apiKey = AppState.config.pollinationsKey;
    const scriptString = JSON.stringify(scriptData, null, 2);

    const systemPrompt = `
    ROLE: Prop Master.
    TASK: Analyze the Screenplay and list IMPORTANT PROPS or BODY PART CLOSE-UPS needed.
    
    INSTRUCTIONS:
    - DO NOT list main characters (we already have them).
    - ONLY list objects (e.g., "Torn Map", "Glowing Crystal") or specific body parts mentioned in close-ups (e.g., "Trembling Hand", "Muddy Boots").
    - Provide a detailed visual description for each prop.
    
    OUTPUT JSON FORMAT:
    {
        "props": [
            {
                "name": "Torn Map",
                "desc": "A vintage topographic map, slightly torn in the middle, yellowed paper texture, detailed ink lines."
            },
            {
                "name": "Lila's Boots (Close Up)",
                "desc": "Extreme close up of lightweight waterproof charcoal ankle boots with quick-lace hooks, covered in mud."
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
        console.log("API: Analyzing Props...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST', headers: headers, body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Prop Analysis Failed");
        
        const data = await response.json();
        const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        throw error;
    }
}

// 2. GENERATE IMAGE (Murni nerima prompt jadi)
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

// 3. UPLOAD IMGBB
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
