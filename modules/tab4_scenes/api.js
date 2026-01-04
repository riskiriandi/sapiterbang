import { AppState } from '../../core/state.js';

// 1. UPLOAD KE IMGBB (Wajib ada biar Logic gak error)
export async function uploadToImgBB(file, name) {
    const apiKey = AppState.config.imgbbKey;
    
    if (!apiKey) {
        throw new Error("API Key ImgBB Kosong! Cek Settings.");
    }

    const formData = new FormData();
    formData.append("image", file, name);

    try {
        console.log("API: Uploading screenshot to ImgBB...");
        // Expiration: 1 Minggu (604800 detik)
        const response = await fetch(`https://api.imgbb.com/1/upload?expiration=604800&key=${apiKey}`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error("ImgBB Failed: " + (result.error ? result.error.message : "Unknown error"));
        }

        return {
            url: result.data.url,
            deleteUrl: result.data.delete_url
        };

    } catch (error) {
        console.error("Upload Error:", error);
        throw error;
    }
}

// 2. GENERATE SHOT (Support Img2Img & Auto Ratio)
export async function generateShotImage(prompt, refImageUrl, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    
    // A. HITUNG RASIO OTOMATIS
    const styleData = AppState.style;
    let width = 1024;
    let height = 1024;

    if (styleData && styleData.ratio === "16:9") {
        width = 1280; height = 720;
    } else if (styleData && styleData.ratio === "9:16") {
        width = 720; height = 1280;
    }

    // B. RAKIT URL
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);
    
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}`;

    // C. FITUR ESTAFET (Img2Img)
    if (refImageUrl) {
        console.log("API: Using Reference Image for Consistency");
        url += `&image=${encodeURIComponent(refImageUrl)}`;
    }

    // D. FETCH (Header Auth)
    const headers = {};
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
        console.log(`API: Generating Shot (${width}x${height})...`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gen Error (${response.status}): ${errText}`);
        }
        
        const blob = await response.blob();
        return blob;

    } catch (error) {
        console.error("Generate Shot Error:", error);
        throw error;
    }
}

// 3. ANALYZE CONTINUITY (Vision AI)
// Ini fungsi yang dicari logic.js tapi belum ada sebelumnya
export async function analyzeContinuity(imageUrl, storyContext) {
    const apiKey = AppState.config.pollinationsKey;
    
    // System Prompt buat Vision
    const systemPrompt = `
    ROLE: Continuity Director.
    TASK: Analyze the provided image (Previous Frame).
    CONTEXT: The next action is: "${storyContext}".
    OUTPUT: A visual prompt for the NEXT frame.
    RULES:
    - Keep character visual identity EXACTLY same as image.
    - Keep background EXACTLY same as image.
    - ONLY change the pose/action to match Context.
    - Output format: "Same scene, [Character] [Action], [Background details]"
    `;

    const payload = {
        model: "openai", // OpenAI Vision
        messages: [
            { role: "system", content: systemPrompt },
            { 
                role: "user", 
                content: [
                    { type: "text", text: "Generate next frame prompt based on this image:" },
                    { type: "image_url", image_url: { url: imageUrl } }
                ]
            }
        ]
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log("API: Analyzing Continuity...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Vision AI Failed");

        const data = await response.json();
        return data.choices[0].message.content; // Balikin teks prompt baru

    } catch (error) {
        console.error("Vision Error:", error);
        // Fallback kalau vision gagal: Balikin prompt standar
        return `(Continuity Error). Same character, same scene. Action: ${storyContext}`;
    }
        }
