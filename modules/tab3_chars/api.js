import { AppState } from '../../core/state.js';

// 1. GENERATE IMAGE (POLLINATIONS)
export async function generateCharImage(prompt, model, width = 1024, height = 1024) {
    const apiKey = AppState.config.pollinationsKey; // Opsional buat image, tapi bagus kalau ada
    
    // Encode prompt biar aman di URL
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Parameter Query
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true&enhance=false&seed=${Math.floor(Math.random() * 10000)}`;
    
    // Kalau ada API Key, tempel di URL (Sesuai dokumentasi: ?key=YOUR_KEY)
    if (apiKey) {
        url += `&key=${apiKey}`;
    }

    try {
        console.log(`API: Generating image with model ${model}...`);
        
        // Fetch BLOB (Binary Image)
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal generate gambar dari Pollinations.");
        
        const blob = await response.blob();
        return blob; // Kita kembalikan file mentah (Blob)

    } catch (error) {
        console.error("Gen Image Error:", error);
        throw error;
    }
}

// 2. UPLOAD TO IMGBB (AUTO EXPIRATION 1 MINGGU)
export async function uploadToImgBB(imageBlob, name) {
    const apiKey = AppState.config.imgbbKey;
    if (!apiKey) throw new Error("API Key ImgBB Kosong! Cek Settings.");

    const formData = new FormData();
    // Expiration: 604800 detik = 1 Minggu
    formData.append("image", imageBlob, `${name}.png`);
    
    try {
        console.log("API: Uploading to ImgBB...");
        // URL Upload dengan parameter expiration
        const uploadUrl = `https://api.imgbb.com/1/upload?expiration=604800&key=${apiKey}`;
        
        const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error ? result.error.message : "ImgBB Upload Failed");
        }

        return {
            url: result.data.url,           // Link Gambar
            deleteUrl: result.data.delete_url // Link Hapus (Opsional disimpan)
        };

    } catch (error) {
        console.error("ImgBB Error:", error);
        throw error;
    }
  }
