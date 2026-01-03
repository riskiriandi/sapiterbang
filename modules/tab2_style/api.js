import { AppState } from '../../core/state.js';

// 1. FUNGSI UPLOAD KE IMGBB
export async function uploadToImgBB(file) {
    const apiKey = AppState.config.imgbbKey;
    
    if (!apiKey) {
        throw new Error("API Key ImgBB belum diisi! Cek menu Settings.");
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
        console.log("ImgBB: Uploading...");
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error("ImgBB Failed: " + (result.error ? result.error.message : "Unknown error"));
        }

        return result.data.url; // Kita cuma butuh URL-nya

    } catch (error) {
        console.error("Upload Error:", error);
        throw error;
    }
}

// 2. FUNGSI VISION AI (ANALISA STYLE)
export async function analyzeStyleAI(imageUrl) {
    const apiKey = AppState.config.pollinationsKey; // Optional tapi recommended

    // System Prompt Khusus Vision
    // Kita suruh AI JANGAN deskripsikan objek (misal: ada kucing), tapi deskripsikan GAYA-nya.
    const systemPrompt = `
    ROLE: Art Director & Visual Style Analyzer.
    TASK: Analyze the visual style of the provided image.
    
    RULES:
    1. IGNORE the subject matter (don't describe the people/objects).
    2. FOCUS ONLY on: Art Style (e.g., Oil Painting, Cyberpunk, 3D Render), Lighting, Color Palette, Camera Angle, Texture, and Rendering Engine.
    3. OUTPUT: A concise comma-separated prompt string suitable for AI Image Generators (Flux/Midjourney).
    
    Example Output: "Cinematic lighting, cyberpunk aesthetic, neon blue and purple palette, highly detailed, unreal engine 5 render, wide angle, photorealistic texture."
    `;

    const payload = {
        model: "openai", // OpenAI model support Vision
        messages: [
            { role: "system", content: systemPrompt },
            { 
                role: "user", 
                content: [
                    { type: "text", text: "Analyze the style of this image:" },
                    { type: "image_url", image_url: { url: imageUrl } }
                ]
            }
        ]
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log("Vision AI: Analyzing...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Vision AI Failed");

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("Vision Error:", error);
        throw new Error("Gagal menganalisa gambar. Pastikan link valid.");
    }
                  }
