require('dotenv').config();
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("."));

const API_KEY = process.env.GEMINI_API_KEY;

app.post("/ask", async (req, res) => {
    try {
        const { issue, age, gender, duration } = req.body;

        // --- THE NLP BRAIN (SYSTEM PROMPT) ---
        const prompt = `
            You are 'RuralDoc AI', a clinical-grade medical assistant for remote areas.
            
            PATIENT DATA:
            - Issue: ${issue}
            - Age: ${age}
            - Gender: ${gender}
            - Duration: ${duration}
            - Current Date: ${new Date().toDateString()}

            NLP INSTRUCTIONS:
            1. Analyze the symptoms provided. 
            2. Consider the current SEASON (e.g., if it's January, consider flu/cold/winter ailments; if July, consider heat/allergies).
            3. Use 'Plain English' - no complex medical jargon. Speak like a friendly local doctor.
            4. If the symptoms sound life-threatening (chest pain, stroke symptoms), set urgency to 'EMERGENCY'.

            You MUST return ONLY a JSON object with this structure:
            {
                "main_action": "A short, bold instruction (e.g., Stay warm and hydrate)",
                "urgency": "LOW, MEDIUM, HIGH, or EMERGENCY",
                "summary": "A 2-3 sentence explanation of why this is happening, mentioning the season if relevant.",
                "potential_issues": ["Simple cause 1", "Simple cause 2"]
            }
        `;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json", temperature: 0.2 }
                })
            }
        );

        const data = await response.json();
        const aiResponse = JSON.parse(data.candidates[0].content.parts[0].text);
        res.json(aiResponse);

    } catch (err) {
        console.error("NLP Error:", err);
        res.status(500).json({ error: "Failed to process symptoms." });
    }
});

app.listen(3000, () => console.log("🚀 Brain Active: http://localhost:3000"));