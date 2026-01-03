// MODULE: Tab 1 API (Fix Endpoint POST)

import { AppState } from '../../core/state.js';

export async function generateStoryAI(roughIdea, useDialog) {
    
    const apiKey = AppState.config.pollinationsKey || null;

    // 1. MODE PENULISAN
    let styleInstruction = "";
    if (useDialog) {
        styleInstruction = `STYLE: SCREENPLAY (Naskah Film). Format: Scene Headings, Action, Dialogue. Focus on interaction.`;
    } else {
        styleInstruction = `STYLE: NOVEL (Narasi). Focus on atmosphere, sensory details, inner thoughts. Minimal dialogue.`;
    }

    // 2. SYSTEM PROMPT
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

    // 3. HEADER & BODY
    const headers = {
        'Content-Type': 'application/json',
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payload = {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER IDEA: ${roughIdea}` }
        ],
        model: "claude", // Kita coba Claude, kalau gagal nanti ganti "openai"
        seed: Math.floor(Math.random() * 99999)
        // jsonMode dihapus biar lebih aman
    };

    try {
        console.log("API: Sending POST request to /openai endpoint...");
        
        // GANTI ENDPOINT KE YANG LEBIH STABIL BUAT POST
        const response = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Kita baca pesan error dari server biar tau kenapa
            const errorText = await response.text();
            console.error("Server Error Details:", errorText);
            throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }
        
        const text = await response.text();
        console.log("API Response Success:", text.substring(0, 100) + "..."); // Log dikit

        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Story API Error FULL:", error);
        // Tampilkan pesan error asli ke alert biar kita bisa debug
        throw new Error(`Gagal: ${error.message}`);
    }
        }
