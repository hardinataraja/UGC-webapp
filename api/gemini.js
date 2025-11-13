// api/gemini.js
// Serverless Function untuk Vercel — proxy aman untuk Google Generative API

export default async function handler(req, res) {
  try {
    // Hanya izinkan POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { model, contents } = req.body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing model or contents in request body' });
    }

    // Ambil API Key dari Environment Variable (Vercel Dashboard → Settings → Environment Variables)
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });
    }

    // Panggil API resmi Google Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();

    // Forward hasil ke client
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Error on serverless:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

