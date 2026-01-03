// MODULE: Tab 1 API (Final Version)
// Fitur: Support API Key, Claude Model, Cat-Person Logic, Anti-404

import { AppState } from '../../core/state.js'; // Kita butuh ini buat ambil API Key

export async function generateStoryAI(roughIdea, useDialog) {
    
    // 1. CEK API KEY (Dari Menu Settings)
    // Kalau user isi key, kita pake. Kalau kosong, null.
    const apiKey = AppState.config.pollinationsKey || null;

    // 2. MODE PENULISAN
    let styleInstruction = "";
    if (useDialog) {
        styleInstruction = `STYLE: SCREENPLAY (Naskah Film). Format: Scene Headings, Action, Dialogue. Focus on interaction.`;
    } else {
        styleInstruction = `STYLE: NOVEL (Narasi). Focus on atmosphere, sensory details, inner thoughts. Minimal dialogue.`;
    }

    // 3. SYSTEM PROMPT (Si Kucing & Template)
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

    // 4. SIAPKAN HEADER & BODY
    const headers = {
        'Content-Type': 'application/json',
    };

    // Kalau ada API Key, tempel di Header (Sesuai contekan lu)
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        console.log("API: Using Custom API Key");
    } else {
        console.log("API: Using Free Mode");
    }

    const payload = {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER IDEA: ${roughIdea}` }
        ],
        model: "claude", // Paksa Claude
        jsonMode: true,
        seed: Math.floor(Math.random() * 99999)
    };

    try {
        console.log("API: Sending POST request...");
        
        // 5. KIRIM REQUEST
        // Kita tembak ke endpoint text yang support OpenAI Format
        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status} (Coba lagi nanti)`);
        }
        
        const text = await response.text();
        
        // 6. BERSIHKAN HASIL
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Story API Error:", error);
        throw new Error("Gagal generate. Cek koneksi atau API Key.");
    }
        }
