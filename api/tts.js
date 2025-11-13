// api/tts.js
// Proxy aman untuk menghasilkan audio dari teks menggunakan Google TTS (Generative Language API audio model)

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in environment." });
    }

    const { text } = req.body || {};
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required." });
    }

    // Model generatif untuk audio (contoh model text→speech di Gemini)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    // Prompt untuk audio (PCM16 base64)
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `Ubah teks berikut menjadi narasi voiceover profesional:\n${text}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "audio/wav",
        audioEncoding: "LINEAR16",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TTS API error:", data);
      return res.status(response.status).json(data);
    }

    // Temukan konten audio base64
    const audioBase64 =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data || null;

    if (!audioBase64) {
      return res.status(500).json({ error: "No audioBase64 found in response", data });
    }

    return res.status(200).json({ audioBase64 });
  } catch (err) {
    console.error("Error in tts.js:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

