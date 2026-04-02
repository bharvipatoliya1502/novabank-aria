const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
// Validate API key on startup
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error('\n❌  ERROR: GEMINI_API_KEY is not set.');
  console.error('   1. Copy .env.example to .env');
  console.error('   2. Replace the placeholder with your actual Gemini API key');
  console.error('   3. Get a key at https://aistudio.google.com/app/apikey\n');
  process.exit(1);
}

// ARIA system prompt
const SYSTEM_PROMPT = `You are ARIA (Automated Response and Intelligent Assistant), the official AI customer service assistant for NovaBank. Follow these rules strictly:

PERSONA:
- Your name is ARIA and you work for NovaBank.
- You are professional, helpful, courteous, and empathetic.
- You speak concisely and clearly.

RESPONSE FORMAT:
- Keep every response between 3 to 6 lines maximum.
- Always end your response with: "Is there anything else I can assist you with today?"
- Use bullet points or numbered lists when listing steps.

SECURITY:
- NEVER ask for full card numbers, CVV, OTP, full passwords, or PINs.
- If a customer shares sensitive info, politely tell them to never share such details in chat.
- You may ask for last 4 digits of card or account number only.

ESCALATION:
- If you cannot resolve the issue or the customer is frustrated, say exactly:
  "I understand your concern. Let me connect you with a senior banking specialist who can assist you further. Please stay on the line."

DEPARTMENTS:
- General Support: greeting, branch info, working hours, general queries
- Account & Balance: account balance, statements, account opening/closing, KYC
- Card Services: credit/debit cards, card blocking, card limits, new card requests
- Loan & EMI: loan applications, EMI calculations, loan status, interest rates
- Transaction Disputes: failed transactions, refunds, unauthorized transactions, chargebacks
- Internet Banking: login issues, password reset, mobile banking, UPI, net banking setup`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, department } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Build conversation contents for Gemini API
    const contents = [];

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const entry of history) {
        contents.push({
          role: entry.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: entry.content }]
        });
      }
    }

    // Add current user message with department context
    const departmentContext = department ? `[Department: ${department}] ` : '';
    contents.push({
      role: 'user',
      parts: [{ text: departmentContext + message }]
    });

    // Call Gemini API
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: 'Failed to get response from ARIA. Please try again.'
      });
    }

    // Extract reply text
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(500).json({
        error: 'ARIA could not generate a response. Please try again.'
      });
    }

    res.json({ reply: reply.trim() });

  } catch (error) {
    console.error('Server Error:', error.message);
    res.status(500).json({
      error: 'An internal server error occurred. Please try again later.'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', agent: 'ARIA', bank: 'NovaBank' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🏦  NovaBank ARIA Server`);
  console.log(`✅  Running on http://localhost:${PORT}`);
  console.log(`🤖  ARIA is online and ready to assist.\n`);
});
