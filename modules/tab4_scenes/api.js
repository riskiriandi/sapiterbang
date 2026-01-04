import { AppState } from '../../core/state.js';

// 1. VISION ANALYSIS (OTAK KONTINUITAS)
// Ini fitur yang lu minta: Upload Screenshot -> AI bikinin Prompt Lanjutan
export async function analyzeContinuity(imageBlob, storyContext) {
    const apiKey = AppState.config.pollinationsKey;
    
    // Convert Blob ke Base64 buat dikirim ke Vision AI
    const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageBlob);
    });

    const systemPrompt = `
    ROLE: Continuity Director.
    TASK: Look at the uploaded screenshot (Previous Frame).
    CONTEXT: The next action in the story is: "${storyContext}".
    
    OUTPUT: Write a visual prompt for the NEXT frame.
    - Keep the character position, outfit, and background EXACTLY the same as the image.
    - ONLY change the pose/expression to match the Context.
    - Format: "Same scene, [Character Description] [New Action], [Background Details]"
    `;

    const payload = {
        model: "openai", // Pakai OpenAI/GPT-4o Vision
        messages: [
            { role: "system", content: systemPrompt },
            { 
                role: "user", 
                content: [
                    { type: "text", text: "Analyze this previous frame and generate prompt for next action." },
                    { type: "image_url", image_url: { url: base64Image } } // Base64 support di beberapa endpoint, atau kita upload dulu ke ImgBB
                ]
            }
        ]
    };

    // Note: Kalau endpoint OpenAI menolak Base64 langsung, kita harus upload ke ImgBB dulu di Logic.
    // Kita asumsikan kita upload ke ImgBB dulu di Logic layer biar aman.
}

// 2. GENERATE SHOT (Sama kayak Tab 3 tapi logic Image-to-Image)
export async function generateShotImage(prompt, refImageUrl, model = "seedream-pro") {
    const apiKey = AppState.config.pollinationsKey;
    
    let url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${model}&width=1280&height=720&nologo=true&enhance=false`;
    
    // Kalau ada gambar referensi (Screenshot video sebelumnya), tempel di URL
    if (refImageUrl) {
        url += `&image=${encodeURIComponent(refImageUrl)}`;
    }

    if (apiKey) {
        // Pake Header Auth nanti di fetch
    }

    // ... (Fetch logic sama kayak Tab 3) ...
                }
