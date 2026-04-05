import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// 🔱 AI COMPLETION ENGINE (SERVER-SIDE)
// This is the secure bridge for Gemini completions, keeping the API Key hidden.
// Used as a fallback for the Concierge and other AI intents.

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ""
);

const genAI = new GoogleGenAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  // 🛡️ AUTHENTICATION RADAR
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 🔱 SESSION VALIDATION
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  // Also allow certain anonymous requests if configured (e.g. from the landing chat)
  // But for now, we'll keep it strict for the Dashboard.
  if (!user && !authHeader.includes(process.env.VITE_SUPABASE_ANON_KEY)) {
    console.error("[AI API] Auth Failure:", authError?.message);
    return res.status(401).json({ error: 'Unauthorized', details: 'Valid Host Session Required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, config = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`[AI API] Processing intent for user: ${user?.email || 'System'}`);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: config.temperature || 0.2,
        maxOutputTokens: config.maxOutputTokens || 500,
        ...config
      }
    });

    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });
  } catch (error) {
    console.error('[AI API] Execution Error:', error.message);
    return res.status(500).json({ 
      error: 'AI Engine recalibrating...',
      details: error.message
    });
  }
}
