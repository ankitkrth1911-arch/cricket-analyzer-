export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers so your frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { shotType } = req.body;

  if (!shotType) {
    return res.status(400).json({ error: 'shotType is required' });
  }

  // API key is stored in Vercel environment variables — never exposed to browser
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server not configured. Contact admin.' });
  }

  const prompt = `You are an expert cricket analyst and live commentator.
The shot type identified: "${shotType}"

Analyze this cricket shot and respond ONLY with valid JSON (no markdown, no extra text):
{
  "shot_type": "name of the shot",
  "power_level": "Low" or "Medium" or "High" or "Explosive",
  "stance_quality": "Poor" or "Average" or "Good" or "Excellent",
  "run_potential": "Dot Ball" or "1 Run" or "2 Runs" or "4 Runs" or "6 Runs",
  "technique_tip": "One coaching tip in 10 words or less",
  "commentary": "3 exciting live commentary sentences, dramatic and energetic like a real broadcaster"
}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      return res.status(groqRes.status).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await groqRes.json();
    let text = data.choices[0].message.content.trim();
    text = text.replace(/```json|```/g, '').trim();

    const result = JSON.parse(text);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
