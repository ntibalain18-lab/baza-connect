const SYSTEM_PROMPT = `You are BazaConnect, an AI service directory for East Africa. Help citizens find doctors, notaries, pharmacies, city halls, banks near them. Operate in Burundi, Rwanda, Kenya, Uganda, Tanzania. Auto-detect language (English/French/Swahili) and respond in same language. Always propose 2-3 realistic providers with name, area, phone, hours, price in local currency (KES/RWF/UGX/TZS/BIF). Mention M-Pesa/MoMo where relevant. End every response with a question or action.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ reply: "⚠️ Service unavailable." });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Invalid request" });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const last = messages[messages.length - 1];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [...history, { role: "user", parts: [{ text: last.content }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        }),
      }
    );
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return res.status(502).json({ reply: "⚠️ Empty response. Try again." });
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ reply: "⚠️ Connection error. Try again." });
  }
}
