require('dotenv').config();
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("."));

const API_KEY = process.env.OPENAI_API_KEY;

app.post("/ask", async (req, res) => {
    try {
        const { issue, age, gender, duration } = req.body;

        // Verify key exists
        if (!API_KEY) {
            console.error("❌ ERROR: API Key is missing from .env file");
            return res.status(500).json({ error: "Server configuration error." });
        }

        const systemPrompt = `
            You are 'RuralDoc AI', a friendly local doctor for remote communities.
            Analyze these symptoms: ${issue}. Patient is ${age} years old, ${gender}, duration ${duration}.
            
            Return ONLY a JSON object:
            {
                "main_action": "Short instruction",
                "urgency": "LOW, MEDIUM, HIGH, or EMERGENCY",
                "summary": "2-3 sentences explaining why.",
                "potential_issues": ["Condition 1", "Condition 2"]
            }
        `;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a medical assistant that only outputs JSON." },
                    { role: "user", content: systemPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();

        // Check for OpenAI errors (like quota or invalid key)
        if (data.error) {
            console.error("OpenAI Error:", data.error.message);
            return res.status(500).json({ error: data.error.message });
        }

        const aiResult = JSON.parse(data.choices[0].message.content);
        res.json(aiResult);

    } catch (err) {
        console.error("Server Crash:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(3000, () => console.log("🚀 Server running at http://localhost:3000"));