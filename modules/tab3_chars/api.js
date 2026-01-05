import { AppState } from '../../core/state.js';

// 1. ANALYZE ASSETS (DENGAN LOGIC HUMANOID KETAT)
export async function analyzeAssetsAI(scriptData) {
    const apiKey = AppState.config.pollinationsKey;
    
    const scriptString = JSON.stringify(scriptData, null, 2);

    const systemPrompt = `
    ROLE: Expert Character Designer & Prop Master.
    TASK: Analyze the Screenplay and list VISUAL ASSETS.
    
    *** CRITICAL CHARACTER DESIGN RULES (MUTLAK) ***
    If the character is a "Humanoid Cat" / "Cat Person":
    1. ANATOMY: Must be 100% HUMANOID (Two arms, two legs, standing upright like a human).
    2. SKIN/FUR: Covered in "FINE SOFT VELVET-LIKE FUR". Do NOT use "rough animal fur".
    3. HEAD: "Stylized Anthropomorphic Head" (Expressive, fits the humanoid body). Do NOT use a photorealistic feral cat head pasted on a human body.
    4. HANDS: Humanoid hands with fingers (essential for holding props).
    5. CLOTHING: Must wear FULL CLOTHING including FOOTWEAR (Boots/Shoes). NO BARE PAWS.
    
    OUTPUT JSON FORMAT:
    {
        "assets": [
            {
                "name": "Ryo",
                "type": "character",
                "desc": "Full body shot of Ryo. Male Anthropomorphic Cat. Athletic humanoid build covered in silver velvet fur. Stylized feline face. Wearing tactical vest, cargo pants, and heavy boots."
            },
            {
                "name": "Ryo's Hand (Holding Map)",
                "type": "prop",
                "desc": "Extreme close up of Ryo's hand. Humanoid shape with silver fur and paw pads, holding a torn map."
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
        console.log("API: Analyzing Assets with Humanoid Logic...");
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

// 2. GENERATE IMAGE (Sama, tapi prompt-nya nanti udah bener dari hasil analisa di atas)
export async function generateCharImage(prompt, model, width = 1024, height = 1024) {
    const apiKey = AppState.config.pollinationsKey;
    
    // Kita tambahin penguat di sini juga biar aman
    const enhancedPrompt = `(Anthropomorphic, Humanoid body structure, standing upright, fine velvet fur). ${prompt}`;
    
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${Math.floor(Math.random() * 10000)}`;
    
    if (apiKey) url += `&key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal generate gambar.");
        return await response.blob();
    } catch (error) { throw error; }
}

// 3. UPLOAD IMGBB (Tetap sama)
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
