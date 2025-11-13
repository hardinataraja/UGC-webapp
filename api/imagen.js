// api/imagen.js
// Proxy aman untuk menghasilkan gambar dari Google Imagen (atau model image generative di Gemini)

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in environment." });
    }

    const { prompt, aspectRatio = "9:16", sampleCount = 1 } = req.body || {};

    if (!prompt || prompt.trim().length < 3) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    // Endpoint Imagen 4 (Google Generative Language API)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;

    const payload = {
      instances: [{ prompt }],
      parameters: {
        sampleCount,
        aspectRatio,
        outputMimeType: "image/png",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Imagen API error:", data);
      return res.status(response.status).json(data);
    }

    // Pastikan hasil berisi base64 gambar
    const imageBase64 =
      data?.predictions?.[0]?.bytesBase64Encoded ||
      data?.predictions?.[0]?.imageBase64 ||
      null;

    if (!imageBase64) {
      return res.status(500).json({ error: "No imageBase64 found in response", data });
    }

    return res.status(200).json({ bytesBase64Encoded: imageBase64 });
  } catch (err) {
    console.error("Error in imagen.js:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

