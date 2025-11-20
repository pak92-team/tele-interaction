require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const OpenAI = require('openai');

// Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const chatId = process.env.CHAT_ID;
const adminId = process.env.ADMIN_ID;

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load messages
let messages = JSON.parse(fs.readFileSync('messages.json', 'utf8'));
let messageIndex = 0;

// --- SEND DAILY MESSAGE (SYSTEM TIME + 30s) ---
function sendNextMessage() {
  const msg = messages[messageIndex];

  if (msg.photo) {
    bot.sendPhoto(chatId, msg.photo, { caption: msg.text })
      .catch(console.error);
  } else {
    bot.sendMessage(chatId, msg.text)
      .catch(console.error);
  }

  messageIndex = (messageIndex + 1) % messages.length;

  // Schedule next message in 24h
  setTimeout(sendNextMessage, 24 * 60 * 60 * 1000);
}

// Start first message after 30s
setTimeout(sendNextMessage, 30 * 1000);

// --- AUTO-REPLY KEYWORD + AI ---
const keywordReplies = {
  'meet': 'Admin will respond shortly!',
  'admin': 'Admin has been notified!'
};

bot.on('message', async (msg) => {
  if (!msg.text) return; // ignore non-text messages

  const text = msg.text.toLowerCase();

  // 1️⃣ Check keywords
  const matchedKeyword = Object.keys(keywordReplies).find(k => text.includes(k));
  if (matchedKeyword) {
    bot.sendMessage(msg.chat.id, keywordReplies[matchedKeyword])
      .catch(console.error);

    // Forward to admin if needed
    if (['meet', 'admin'].includes(matchedKeyword)) {
      bot.sendMessage(adminId, `User @${msg.from.username || msg.from.first_name} sent: ${msg.text}`)
        .catch(console.error);
    }
    return;
  }

  // 2️⃣ Use AI for all other messages
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
You are a Telegram bot. Always reply in English.
- Respond short, friendly, and concise.
- Answer greetings, help requests, or simple questions directly.
- Never reply in Vietnamese.
`
        },
        { role: "user", content: text }
      ],
      max_tokens: 150
    });

    const reply = response.choices[0].message.content;
    bot.sendMessage(msg.chat.id, reply)
      .catch(console.error);

  } catch (err) {
    console.error("GPT error:", err);

    // 429 rate limit → AI busy
    if (err.status === 429) {
      bot.sendMessage(msg.chat.id, "Sorry, AI is busy. Please try again in a few minutes.")
        .catch(console.error);
    } else {
      // fallback English only
      bot.sendMessage(msg.chat.id, "Sorry, I cannot answer this right now. Please type 'admin' to contact a human.")
        .catch(console.error);
    }
  }
});
