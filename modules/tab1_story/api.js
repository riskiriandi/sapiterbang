import { AppState } from '../../core/state.js';

export async function generateStoryAI(roughIdea, useDialog) {
    
    const apiKey = AppState.config.pollinationsKey ? AppState.config.pollinationsKey.trim() : null;

    // Mode Instruksi
    let styleInstruction = useDialog 
        ? "STYLE: Screenplay/Naskah Film (Focus on Dialogue & Action)." 
        : "STYLE: Novel/Narasi (Focus on Atmosphere & Description).";

    // SYSTEM PROMPT: SMART SEGMENTATION
    const systemPrompt = `
    ROLE: Professional Storyboard Writer & Visualizer.
    LANGUAGE: Story in INDONESIAN. Visual Notes in ENGLISH.
    
    ${styleInstruction}
    
    TASK:
    1. Write a story based on the user idea.
    2. BREAK DOWN the story into logical "VISUAL SEGMENTS" (Chunks).
    
    RULES FOR SEGMENTATION:
    - Group sentences that belong to the SAME visual shot/moment.
    - Example: "Fajar menyingsing. 3 orang mendaki." -> This is ONE segment (Wide Shot).
    - Example: "Ryo kedinginan. Bulunya berdiri." -> This is ONE segment (Focus Shot).
    - If there is dialogue, put it in its own segment.

    SPECIAL RULE: "HUMANOID KUCING"
    - Describe them as: "Anthropomorphic feline head, humanoid body with fine fur".

    OUTPUT JSON FORMAT ONLY:
    {
        "segments": [
            {
                "type": "ESTABLISHING" (or ACTION / DIALOGUE / FOCUS),
                "text": "Teks naskah bahasa Indonesia...",
                "visual_note": "Brief English visual description (e.g., Wide shot of sunrise, silhouettes of 3 characters)"
            }
        ],
        "characters": [
            { "name": "Name", "desc": "Full English visual description..." }
        ]
    }
    `;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const payload = {
        model: "openai", // Pakai model text yang pinter logika
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER IDEA: ${roughIdea}` }
        ],
        seed: Math.floor(Math.random() * 99999)
    };

    try {
        console.log("API: Sending Smart Segment Request...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errText}`);
        }
        
        const data = await response.json();
        const text = data.choices[0].message.content;
        const cleanText = text.replace(/```json|```/g, '').trim();
        
        // Validasi JSON
        const result = JSON.parse(cleanText);
        if(!result.segments || !result.characters) throw new Error("Format JSON AI salah.");

        return result;

    } catch (error) {
        console.error("Story API Error:", error);
        throw new Error(`Gagal: ${error.message}`);
    }
        }
