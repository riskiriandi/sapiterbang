import { AppState } from '../../core/state.js';

export async function generateStoryAI(roughIdea, useDialog) {
    
    const apiKey = AppState.config.pollinationsKey ? AppState.config.pollinationsKey.trim() : null;

    // 1. INSTRUKSI GAYA PENULISAN (LEBIH TEGAS)
    let styleInstruction = "";
    
    if (useDialog) {
        // MODE NASKAH / DIALOG
        styleInstruction = `
        MODE: SCRIPT / SCREENPLAY.
        - Format: Use standard script format (Scene Headings, Character Names, Dialogue).
        - Focus: Interaction and spoken words.
        - Example: 
          RYO: "Cepat lari!"
          MIKA: "Baik!"
        `;
    } else {
        // MODE NOVEL / NARASI (INI YANG LU MAU)
        styleInstruction = `
        MODE: NOVEL / NARRATIVE FICTION.
        - Format: Write in flowing paragraphs.
        - FORBIDDEN: Do NOT use script format (No "Character: Dialogue").
        - Focus: Describe actions, internal thoughts, atmosphere, and sensory details (smell, touch, sight).
        - Instead of dialogue, describe the intent. (e.g., "Ryo gestured for Mika to follow him," instead of Ryo saying "Follow me").
        `;
    }

    // 2. SYSTEM PROMPT
    const systemPrompt = `
    ROLE: Best-Selling Novelist & Creative Writer.
    LANGUAGE: Story in INDONESIAN. Visual Notes in ENGLISH.
    
    ${styleInstruction}
    
    TASK:
    1. Expand the user's rough idea into a compelling story.
    2. Divide the story into logical PARAGRAPHS (Segments).
    
    SPECIAL RULE: "HUMANOID KUCING"
    - If mentioned, visualize them as: "Anthropomorphic feline head, humanoid body covered in fine fur, expressive tail/ears."

    OUTPUT JSON FORMAT ONLY:
    {
        "segments": [
            {
                "type": "NARRATIVE" (or DIALOGUE if mode is ON),
                "text": "Tulis paragraf cerita yang indah dan detail disini...",
                "visual_note": "Brief English visual description for Illustrator (e.g., Close up of Ryo's trembling hand, misty mountain background)"
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
        model: "openai", 
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER IDEA: ${roughIdea}` }
        ],
        seed: Math.floor(Math.random() * 99999)
    };

    try {
        console.log("API: Generating Story (Mode: " + (useDialog ? "Dialog" : "Novel") + ")...");
        
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
        
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Story API Error:", error);
        throw new Error(`Gagal: ${error.message}`);
    }
}
