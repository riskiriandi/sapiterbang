// MODULE: Tab 1 API (The Brain)
// Fitur: Claude Model, Cat-Person Logic, Strict Template, Master Script Mode

export async function generateStoryAI(roughIdea, useDialog) {
    
    // 1. TENTUKAN MODE PENULISAN (Novel vs Naskah)
    let styleInstruction = "";
    
    if (useDialog) {
        // Mode Dialog (Screenplay Format)
        styleInstruction = `
        STYLE: SCREENPLAY / NASKAH FILM.
        - Use standard script format (Scene Headings, Action Lines, Character Names, Dialogue).
        - Focus on conversation and interaction.
        - Language: INDONESIAN.
        `;
    } else {
        // Mode Novel (Descriptive Format)
        styleInstruction = `
        STYLE: NOVEL / CERPEN.
        - Focus on atmospheric description, sensory details (sight, sound, smell), and inner thoughts.
        - Minimal dialogue. Use narrative flow.
        - Language: INDONESIAN.
        `;
    }

    // 2. SYSTEM PROMPT (INTRUKSI MUTLAK)
    const systemPrompt = `
    ROLE: Professional Storyboard Writer & Character Designer.
    
    === TASK 1: THE STORY ===
    ${styleInstruction}
    - IMPORTANT: Write a CONTINUOUS MASTER SCRIPT. 
    - Do NOT break the story into "Shots" or "Camera Angles" yet. Just tell the full story flow per Scene/Location.
    
    === TASK 2: CHARACTER DESIGN (ENGLISH ONLY) ===
    - Extract characters and describe them visually in ENGLISH.
    - You MUST use this strict template for every character:
      Format: [Name]: [Gender & Age] [Body Build] [Skin/Fur Texture] [Detailed Top Outfit] [Detailed Bottom Outfit] [Footwear] [Accessories] [Vibe/Expression]

    === SPECIAL RULE: "HUMANOID KUCING" / "CAT PERSON" ===
    If the user mentions 'Humanoid Kucing', 'Manusia Kucing', or 'Cat Person', you MUST follow this visual guide:
    - HEAD: Realistic anthropomorphic feline head (whiskers, wet nose, cat ears).
    - BODY: Humanoid structure (two arms, two legs, upright) but covered entirely in fine, soft, velvet-like fur (NOT bare human skin).
    - HANDS: Humanoid with 5 fingers but with paw pads and fur.
    - INTEGRATION: Do not just copy this text. Blend it naturally into the [Skin/Fur Texture] and [Body Build] section of the template above.

    === OUTPUT FORMAT ===
    Return ONLY valid JSON:
    {
        "script": "Teks naskah bahasa Indonesia...",
        "characters": [
            "Name: Full English description following the template..."
        ]
    }
    `;

    const fullPrompt = `${systemPrompt}\n\nUSER IDEA: ${roughIdea}`;

    // 3. FETCH KE POLLINATIONS (CLAUDE MODEL)
    // Random seed biar hasil gak monoton
    const seed = Math.floor(Math.random() * 99999);
    
    // Encode URI Component wajib biar karakter aneh gak bikin error
    const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=claude&seed=${seed}&json=true`;

    try {
        console.log("API: Sending request to Claude...");
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        
        // 4. CLEANING & PARSING
        // Kadang AI ngasih markdown ```json ... ```, kita bersihkan
        const cleanText = text.replace(/```json|```/g, '').trim();
        
        // Cek validitas JSON
        try {
            const jsonResult = JSON.parse(cleanText);
            
            // Validasi struktur data (Jaga-jaga kalau AI halu)
            if (!jsonResult.script || !jsonResult.characters) {
                throw new Error("Format JSON dari AI tidak lengkap.");
            }
            
            return jsonResult;

        } catch (e) {
            console.error("JSON Parse Error:", e);
            console.log("Raw Text:", text); // Buat debug
            throw new Error("Gagal memproses jawaban AI. Coba lagi.");
        }

    } catch (error) {
        console.error("Story API Error:", error);
        throw error; // Lempar error ke Logic biar muncul alert
    }
        }
