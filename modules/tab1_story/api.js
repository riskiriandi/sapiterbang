import { AppState } from '../../core/state.js';

// === FASE 1: KONSEP & KARAKTER (ANTI-NYEKER) ===
export async function generateStoryConcept(idea) {
    const apiKey = AppState.config.pollinationsKey;
    
    const systemPrompt = `
    ROLE: Character Designer & Novelist.
    TASK: Develop a story concept and define characters based on user idea.
    
    CRITICAL CHARACTER RULES (STRICT):
    1. ANATOMY: Characters are "Stylized Anthropomorphic" (Furry style). Humanoid body proportions.
       - Head: Expressive animal-like but distinct from feral animals.
       - Body: Fully Humanoid structure (shoulders, arms, hands with fingers).
    2. OUTFIT: Characters MUST wear full clothing.
       - FOOTWEAR IS MANDATORY: Characters MUST wear shoes, boots, or sneakers. NO BARE PAWS/FEET allowed.
       - Describe specific footwear (e.g., "heavy combat boots", "white sneakers").
    
    OUTPUT JSON:
    {
        "synopsis": "Short story summary (Indonesian)...",
        "characters": [
            {
                "name": "Name",
                "desc": "Full English visual description. Include: Species, Fur Color, Body Type, CLOTHING (Top & Bottom), and FOOTWEAR."
            }
        ]
    }
    `;

    const payload = {
        model: "openai", // Pakai OpenAI/Claude (via Pollinations)
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `IDEA: ${idea}` }
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 10000)
    };

    return await callAI(payload, apiKey);
}

// === FASE 2: SKENARIO & TIMING (DYNAMIC PACING) ===
export async function generateScreenplay(storyContext, charData, duration) {
    const apiKey = AppState.config.pollinationsKey;
    
    // Format karakter biar AI tau siapa mereka
    const charList = charData.map(c => `${c.name}: ${c.desc}`).join('\n');

    const systemPrompt = `
    ROLE: Professional Screenwriter & Video Editor.
    TASK: Convert the story into a Video Script with precise timing.
    TARGET DURATION: Approx ${duration} seconds.
    
    TIMING RULES (DYNAMIC PACING):
    - Do NOT make every shot the same length.
    - Fast actions / Reactions / Quick cuts = 1-2 seconds.
    - Normal actions / Dialogue = 3-4 seconds.
    - Establishing shots / Scenery / Slow moments = Max 6 seconds.
    - Total duration must sum up close to ${duration}s.

    OUTPUT JSON:
    {
        "title": "Judul Video",
        "scenes": [
            {
                "timestamp": "00:00-00:04",
                "duration": 4,
                "location": "Kitchen",
                "visual": "Wide shot of Ryo entering...",
                "audio": "Footsteps..."
            },
            {
                "timestamp": "00:04-00:05",
                "duration": 1,
                "location": "Kitchen",
                "visual": "Quick cut: Glass slipping from hand...",
                "audio": "Shattering sound..."
            }
        ]
    }
    `;

    const payload = {
        model: "openai",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `STORY:\n${storyContext}\n\nCHARACTERS:\n${charList}` }
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 10000)
    };

    return await callAI(payload, apiKey);
}

// --- HELPER FETCH ---
async function callAI(payload, apiKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST', headers: headers, body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("AI Error");
        const data = await response.json();
        const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        throw error;
    }
                         }
