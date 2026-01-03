import { AppState } from '../../core/state.js';

// 1. GENERATE IMAGE (POLLINATIONS)
// Sekarang menerima width & height
export async function generateCharImage(prompt, model, width, height) {
    const apiKey = AppState.config.pollinationsKey; 
    
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Masukkan width & height ke URL
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${Math.floor(Math.random() * 10000)}`;
    
    if (apiKey) {
        url += `&key=${apiKey}`;
    }

    try {
        console.log(`API: Generating ${width}x${height} with model ${model}...`);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal generate gambar.");
        
        const blob = await response.blob();
        return blob;

    } catch (error) {
        console.error("Gen Image Error:", error);
        throw error;
    }
}

// 2. UPLOAD TO IMGBB (Sama kayak sebelumnya)
export async function uploadToImgBB(imageBlob, name) {
    const apiKey = AppState.config.imgbbKey;
    if (!apiKey) throw new Error("API Key ImgBB Kosong! Cek Settings.");

    const formData = new FormData();
    formData.append("image", imageBlob, `${name}.png`);
    
    try {
        const uploadUrl = `https://api.imgbb.com/1/upload?expiration=604800&key=${apiKey}`;
        
        const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        
        if (!result.success) throw new Error(result.error ? result.error.message : "Upload Failed");

        return {
            url: result.data.url,
            deleteUrl: result.data.delete_url
        };

    } catch (error) {
        console.error("ImgBB Error:", error);
        throw error;
    }
    }
