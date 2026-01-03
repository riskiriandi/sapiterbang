// MODULE: Tab 1 API (Fixed Endpoint & Debug)

import { AppState } from '../../core/state.js';

export async function generateStoryAI(roughIdea, useDialog) {
    
    // 1. AMBIL API KEY DARI STATE
    // Kita pastikan dulu datanya ada
    const apiKey = AppState.config.pollinationsKey ? AppState.config.pollinationsKey.trim() : null;

    // DEBUG: Cek apakah Key terbaca? (Cek Console F12)
    if (apiKey) {
        console.log("🔑 API Key Terdeteksi: " + apiKey.substring(0, 5) + "...");
    } else {
        console.warn("⚠️ API Key Kosong. Menggunakan Mode Gratis (Mungkin lebih lambat/limit).");
    }

    // 2. MODE PENULISAN
    let styleInstruction = "";
    if (useDialog) {
        styleInstruction = `STYLE: SCREENPLAY (Naskah Film). Format: Scene Headings, Action, Dialogue. Focus on interaction.`;
    } else {
        styleInstruction = `STYLE: NOVEL (Narasi). Focus on atmosphere, sensory details, inner thoughts. Minimal dialogue.`;
    }

    // 3. SYSTEM PROMPT
    const systemPrompt = `
    ROLE: Professional Storyboard Writer.
    LANGUAGE: Script in INDONESIAN. Character Visuals in ENGLISH.
    
    ${styleInstruction}
    
    TASK 1: MASTER SCRIPT
    - Write a CONTINUOUS story flow. Do NOT break into "Shots" yet.
    
    TASK 2: CHARACTER DESIGN (Strict Template)
    - Format: [Name]: [Gender & Age] [Body Build] [Skin/Fur Texture] [Detailed Top Outfit] [Detailed Bottom Outfit] [Footwear] [Accessories] [Vibe]

    SPECIAL RULE: "HUMANOID KUCING" / "CAT PERSON"
    - If user mentions this, you MUST describe them as: "Anthropomorphic feline head (whiskers, wet nose, cat ears), Humanoid body structure covered in fine soft velvet-like fur, Humanoid hands with paw pads."
    - Blend this description naturally into the template.

    OUTPUT JSON:
    {
        "script": "Teks naskah...",
        "characters": ["Name: English description..."]
    }
    `;

    // 4. HEADER & BODY (Sesuai CURL User)
    const headers = {
        'Content-Type': 'application/json',
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payload = {
        model: "openai", // Kita pakai 'openai' dlu sbg base model (paling stabil di endpoint ini)
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER IDEA: ${roughIdea}` }
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 99999)
    };

    try {
        console.log("API: Sending request to gen.pollinations.ai...");
        
        // GANTI ENDPOINT SESUAI CURL LU
        const response = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errText}`);
        }
        
        const text = await response.text();
        console.log("API Success:", text.substring(0, 50) + "...");

        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Story API Error:", error);
        
        // Pesan Error yang Manusiawi
        let msg = error.message;
        if (msg.includes("401")) msg = "API Key Salah/Expired.";
        if (msg.includes("429")) msg = "Terlalu banyak request (Limit). Tunggu sebentar.";
        if (msg.includes("500")) msg = "Server AI lagi down. Coba lagi.";
        
        throw new Error(msg);
    }
}
