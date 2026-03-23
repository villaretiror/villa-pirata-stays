import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 🛰️ SALTY VOICE ENGINE (OpenAI TTS)
 * Genera audio de alta fidelidad con la voz 'Onyx'.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: 'Text is required' });

    // 🛡️ Markdown Purge (Double Check)
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/__/g, '')
      .replace(/_/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '');

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx", // 🔱 Voz Masculina, Cálida y Autoritaria
      input: cleanText,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);

  } catch (err: any) {
    console.error("[Voice Engine] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
