// api/imagen.js
// Proxy untuk Imagen 4.0 dengan auto-retry handling 429 & 5xx

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const { prompt, aspectRatio = "9:16", sampleCount = 1 } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;
    const payload = JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount, aspectRatio, outputMimeType: "image/png" },
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
          console.warn(`Retrying Imagen API (attempt ${attempt}) in ${wait}ms...`);
          await delay(wait);
          return fetchWithRetry(attempt + 1);
        }
      }
      return response;
    };

    const response = await fetchWithRetry();
    const data = await response.json();

    if (!response.ok) {
      console.error("Imagen API error:", data);
      return res.status(response.status).json(data);
    }

    const base64 =
      data?.predictions?.[0]?.bytesBase64Encoded ||
      data?.predictions?.[0]?.imageBase64 ||
      null;

    if (!base64) return res.status(500).json({ error: "No imageBase64 found in response" });
    return res.status(200).json({ bytesBase64Encoded: base64 });
  } catch (err) {
    console.error("Imagen proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}