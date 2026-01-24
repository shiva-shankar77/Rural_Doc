const express = require("express");

const app = express();
app.use(express.json());

// ⚠️ TEMPORARY (testing only)
// After this works, you MUST move this to .env and rotate the key
const API_KEY = "AIzaSyCGDjP_GV4WRJGaZmW_07CP2us36OSUpVI";

// Cache model so we don’t fetch it every request
let CACHED_MODEL = null;

/**
 * Get a Gemini model that supports generateContent
 * (works with YOUR API key, no guessing)
 */
async function getValidModel() {
  if (CACHED_MODEL) return CACHED_MODEL;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?key=" + API_KEY
  );
  const data = await res.json();

  if (!data.models) {
    throw new Error("No models returned for this API key");
  }

  const model = data.models.find(
    m => m.supportedGenerationMethods?.includes("generateContent")
  );

  if (!model) {
    throw new Error("No generateContent-capable model found");
  }

  CACHED_MODEL = model.name; // cache it
  console.log("✅ USING MODEL:", CACHED_MODEL);
  return CACHED_MODEL;
}

app.post("/ask", async (req, res) => {
  try {
    const { issue, age, gender, duration } = req.body;

    if (!issue || !age || !duration) {
      return res.json({
        text: "Please provide issue, age, and duration for assessment."
      });
    }

    const modelName = await getValidModel();

    // 🔥 CLINICAL-GRADE PROMPT
    const prompt = `
You are RuralDoc AI, a clinical-grade health assistant designed for rural and low-resource settings.

PATIENT DETAILS:
- Issue: ${issue}
- Age: ${age}
- Gender: ${gender || "Not specified"}
- Duration: ${duration}

INSTRUCTIONS:
Respond in clear Markdown using ONLY the following sections and headings:

### 🩺 Primary Assessment
What this condition most likely represents.

### 🧠 Why this may be happening
Explain possible causes in simple, non-technical language.

### ✅ What you should do now
Practical steps the patient can take immediately at home.

### 🏥 When to visit a clinic or hospital
Clear warning signs and whether a clinic or emergency care is needed.

### 🚨 Urgency Level
ONE word only: LOW / MEDIUM / HIGH / EMERGENCY

RULES:
- Be calm, supportive, and practical.
- Do NOT give a final diagnosis.
- Do NOT use complex medical jargon.
- Always include a short medical disclaimer at the end.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 700
          }
        })
      }
    );

    const data = await response.json();

    let text = "No response from AI.";

    if (
      data.candidates &&
      data.candidates[0]?.content?.parts?.[0]?.text
    ) {
      text = data.candidates[0].content.parts[0].text;
    } else if (data.error) {
      text = "Gemini error: " + data.error.message;
    }

    res.json({ text });
  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({
      text: "Server error. Please try again."
    });
  }
});

// Serve frontend
app.use(express.static("."));

app.listen(3000, () => {
  console.log("✅ RuralDoc AI server running at http://localhost:3000");
});
