// MODULE: Tab 1 API (VIP Endpoint - Claude Support)
// Menggunakan endpoint 'gen.pollinations.ai' sesuai kode lama user.

import { AppState } from '../../core/state.js';

export async function generateStoryAI(roughIdea, useDialog) {
    
    // 1. AMBIL API KEY
    const apiKey = AppState.config.pollinationsKey ? AppState.config.pollinationsKey.trim() : null;

    // Cek Key (Wajib ada buat endpoint ini kalau mau pilih model)
    if (!apiKey) {
        console.warn("⚠️ API Key Kosong! Endpoint ini mungkin menolak request tanpa key atau fallback ke model dasar.");
    } else {
        console.log("🔑 Menggunakan API Key & Model Claude");
    }

    // 2. MODE PENULISAN
    let styleInstruction = "";
    if (useDialog) {
        styleInstruction = `STYLE: SCREENPLAY (Naskah Film). Format: Scene Headings, Action, Dialogue. Focus on interaction.`;
    } else {
        styleInstruction = `STYLE: NOVEL (Narasi). Focus on atmosphere, sensory details, inner thoughts. Minimal dialogue.`;
    }

    // 3. SYSTEM PROMPT (Otak Cerdas Kita)
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

    OUTPUT JSON ONLY:
    {
        "script": "Teks naskah...",
        "characters": ["Name: English description..."]
    }
    `;

    // 4. HEADER & BODY (Sesuai Kode Lama Lu)
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // Header Wajib buat VIP
    };

    const payload = {
        model: "claude", // NAH INI DIA! Kita tembak Claude.
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER IDEA: ${roughIdea}` }
        ],
        // Kita gak pake jsonMode: true, kita percaya sama prompt "OUTPUT JSON ONLY"
        // biar gak bentrok sama model Claude
    };

    try {
        console.log("API: Sending request to gen.pollinations.ai (Claude)...");
        
        // ENDPOINT SAKTI (Sesuai kode lama lu)
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errText}`);
        }
        
        // Parsing cara OpenAI (karena endpointnya kompatibel OpenAI)
        const data = await response.json();
        const text = data.choices[0].message.content;

        console.log("API Success:", text.substring(0, 50) + "...");

        // Bersihkan Markdown JSON
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Story API Error:", error);
        throw new Error(`Gagal: ${error.message}`);
    }
}
