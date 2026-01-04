import { AppState } from '../../core/state.js';

// 1. UPLOAD KE IMGBB (Durasi 1 Minggu)
export async function uploadToImgBB(file, name) {
    const apiKey = AppState.config.imgbbKey;
    
    if (!apiKey) {
        throw new Error("API Key ImgBB Kosong! Cek Settings.");
    }

    const formData = new FormData();
    formData.append("image", file, name);

    try {
        console.log("API: Uploading screenshot to ImgBB...");
        // Expiration: 604800 detik (1 Minggu)
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
    
    // A. HITUNG RASIO OTOMATIS (Ambil dari Tab 2)
    const styleData = AppState.style;
    let width = 1024;
    let height = 1024;

    if (styleData && styleData.ratio === "16:9") {
        width = 1280; height = 720;
    } else if (styleData && styleData.ratio === "9:16") {
        width = 720; height = 1280;
    }
    // Kalau 1:1 tetap 1024

    // B. RAKIT URL
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);
    
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${seed}`;

    // C. FITUR ESTAFET (Img2Img)
    // Kalau ada gambar referensi (Screenshot), tempel di URL
    if (refImageUrl) {
        console.log("API: Using Reference Image for Consistency");
        url += `&image=${encodeURIComponent(refImageUrl)}`;
    }

    // D. FETCH (Pake Header Auth biar URL gak kepanjangan)
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
