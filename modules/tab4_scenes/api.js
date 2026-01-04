import { AppState } from '../../core/state.js';

export async function breakdownScriptAI(scriptText, mode) {
    const apiKey = AppState.config.pollinationsKey;

    // INSTRUKSI MODE
    let modeInstruction = "";
    if (mode === 'shorts') {
        modeInstruction = `
        MODE: SHORTS / TIKTOK (Fast Paced).
        - Combine small actions into ONE continuous shot (5-8 seconds).
        - Don't cut too often. Keep the flow.
        - Only cut if the location changes or the angle MUST change drastically.
        `;
    } else {
        modeInstruction = `
        MODE: CINEMATIC (Detailed).
        - Break down every subtle movement into separate shots.
        - Focus on artistic angles and emotional details.
        `;
    }

    const systemPrompt = `
    ROLE: Professional Movie Director.
    TASK: Convert the narrative text into a TECHNICAL SCREENPLAY SHOT LIST.
    
    ${modeInstruction}
    
    RULES:
    1. MASTER LOCATION: Define one consistent background description for the whole scene.
    2. DURATION: Estimate shot duration (usually 5s to 8s for AI video).
    3. CONTINUATION: If an action is long (e.g., running for 15s), split it into shots and mark "is_linked": true (meaning: use previous frame as input).
    
    OUTPUT JSON FORMAT:
    {
        "location_prompt": "Visual description of the environment (No characters)...",
        "shots": [
            {
                "id": 1,
                "type": "WIDE" (or MID, CLOSE UP, MACRO),
                "subject": "Ryo",
                "action": "Description of action (e.g. Walking towards camera)",
                "camera": "Low angle, tracking shot",
                "duration": 5,
                "is_linked": false (true if this is a direct continuation of previous shot)
            }
        ]
    }
    `;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const payload = {
        model: "openai", 
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `SCRIPT SEGMENT: "${scriptText}"` }
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 9999)
    };

    try {
        console.log(`Director AI: Breakdown (${mode})...`);
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        const cleanJson = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        
        return JSON.parse(cleanJson);

    } catch (error) {
        console.error("Director Error:", error);
        throw error;
    }
                }
