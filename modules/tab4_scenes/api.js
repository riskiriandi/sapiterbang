import { AppState } from '../../core/state.js';

export async function breakdownScriptAI(scriptText) {
    const apiKey = AppState.config.pollinationsKey; // Optional buat text

    // SYSTEM PROMPT: THE DIRECTOR LOGIC
    const systemPrompt = `
    ROLE: Professional Movie Director & Cinematographer.
    TASK: Analyze the script segment and break it down into a VISUAL SHOT LIST.
    
    RULES:
    1. EXTRACT LOCATION: First, define the Master Location/Setting description (Background only, no characters).
    2. DEFINE SHOTS: Break the action into logical camera shots.
       - Establishing/Wide: For new location/context.
       - Close Up: For emotions/dialogue.
       - Macro/Detail: For specific hand/foot actions or objects.
       - Action: For dynamic movement.
    
    OUTPUT FORMAT (JSON Object):
    {
        "location": "Detailed description of the environment/background...",
        "shots": [
            {
                "type": "WIDE" (or CLOSE UP, MID, MACRO, LOW ANGLE),
                "subject": "Main focus (e.g. Ryo, Ryo's Hand, The Door)",
                "action": "Description of the action/pose..."
            }
        ]
    }
    `;

    const payload = {
        model: "openai", // Kita butuh logika teks yang kuat
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `SCRIPT SEGMENT: "${scriptText}"` }
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 9999)
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    try {
        console.log("Director AI: Breaking down script...");
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanJson = content.replace(/```json|```/g, '').trim();
        
        return JSON.parse(cleanJson);

    } catch (error) {
        console.error("Director Error:", error);
        throw error;
    }
          }
