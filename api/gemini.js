// api/gemini.js
// Proxy aman untuk Google Gemini dengan auto-retry server-side (429 & 5xx handling)

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const { model, contents } = req.body || {};
    if (!model || !contents) return res.status(400).json({ error: "Missing model or contents" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    const payload = JSON.stringify({ contents });

    // Fungsi fetch dengan retry server-side
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
          console.warn(`Retrying Gemini API (attempt ${attempt}) in ${wait}ms...`);
          await delay(wait);
          return fetchWithRetry(attempt + 1);
        }
      }
      return response;
    };

    const response = await fetchWithRetry();
    const data = await response.json();

    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Gemini proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
}