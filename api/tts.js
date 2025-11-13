// api/tts.js
// Proxy aman untuk Text-to-Speech via Gemini API + auto-retry untuk 429/500

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const { text } = req.body || {};
    if (!text || text.trim().length === 0) return res.status(400).json({ error: "Text is required" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const payload = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `Ubah teks berikut menjadi narasi voiceover profesional:\n${text}` }] }],
      generationConfig: {
        responseMimeType: "audio/wav",
        audioEncoding: "LINEAR16",
      },
    });

    const fetchWithRetry = async (attempt = 1) => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt <= 4) {
          const wait = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(`Retrying TTS API (attempt ${attempt}) in ${wait}ms...`);
          await delay(wait);
          return fetchWithRetry(attempt + 1);
        }
      }
      return response;
    };

    const response = await fetchWithRetry();
    const data = await response.json();

    if (!response.ok) {
      console.error("TTS API error:", data);
      return res.status(response.status).json(data);
    }

    const audioBase64 =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data || null;

    if (!audioBase64) return res.status(500).json({ error: "No audioBase64 found in response" });

    return res.status(200).json({ audioBase64 });
  } catch (err) {
    console.error("TTS proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}