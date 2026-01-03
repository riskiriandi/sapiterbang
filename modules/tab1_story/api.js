// MODULE: Tab 1 API (Fixed Model Name & Endpoint)

import { AppState } from '../../core/state.js';

export async function generateStoryAI(roughIdea, useDialog) {
    
    // 1. AMBIL API KEY
    const apiKey = AppState.config.pollinationsKey ? AppState.config.pollinationsKey.trim() : null;

    // 2. MODE PENULISAN
    let styleInstruction = "";
    if (useDialog) {
        styleInstruction = `STYLE: SCREENPLAY (Naskah Film). Format: Scene Headings, Action, Dialogue. Focus on interaction.`;
    } else {
        styleInstruction = `STYLE: NOVEL (Narasi). Focus on atmosphere, sensory details, inner thoughts. Minimal dialogue.`;
    }

    // 3. SYSTEM PROMPT (Tetap sama, logic Kucing & Template aman)
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

    // 4. HEADER & BODY (Sesuai Standar OpenAI/Pollinations Gen)
    const headers = {
        'Content-Type': 'application/json',
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payload = {
        // PENTING: Ganti 'claude' jadi 'openai'. Server akan otomatis kasih model terbaik.
        model: "openai", 
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER IDEA: ${roughIdea}` }
        ],
        // Hapus jsonMode: true karena kadang bikin error di endpoint gen
        // Kita andalkan prompt "OUTPUT JSON" di atas
        seed: Math.floor(Math.random() * 99999)
    };

    try {
        console.log("API: Sending request to gen.pollinations.ai...");
        
        // GANTI ENDPOINT KE JALUR UTAMA (GEN)
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errText}`);
        }
        
        // Endpoint ini mengembalikan format OpenAI (ada choices[0].message.content)
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
