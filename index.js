require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const chatId = process.env.CHAT_ID;
const adminId = process.env.ADMIN_ID;

// Load messages
let messages = JSON.parse(fs.readFileSync('messages.json', 'utf8'));
let messageIndex = 0;

// Hàm gửi tin nhắn mỗi 30 giây
function sendNextMessage() {
  bot.sendMessage(chatId, messages[messageIndex]);
  messageIndex = (messageIndex + 1) % messages.length;

  // Lên lịch gửi lần tiếp theo sau 30 giây
  setTimeout(sendNextMessage, 30 * 1000);
}

// Bắt đầu gửi lần đầu ngay sau 30 giây
// setTimeout(sendNextMessage, 30 * 1000);

// Auto-reply keywords
const keywordReplies = {
  'hello': 'Welcome to the team, mate👋',
  'help': 'what type of information are you looking for, Sir?',
  'meet': 'Admin will reply soon',
  'admin': 'Admin received the notification !'
};

bot.on('message', (msg) => {
  console.log(msg.chat.id); // lấy chatId
  const text = msg.text.toLowerCase();
  if (keywordReplies[text]) {
    bot.sendMessage(msg.chat.id, keywordReplies[text]);
    // Forward to admin nếu keyword là meet/admin
    if (['meet', 'admin'].includes(text)) {
      bot.sendMessage(adminId, `User @${msg.from.username || msg.from.first_name} vừa gửi: ${msg.text}`);
    }
  }
});


// const keywordReplies = {
//   'hello': 'Welcome to the team, mate👋',
//   'help': 'what type of information are you looking for, Sir?',
//   'meet': 'Admin will reply soon',
//   'admin': 'Admin received the notification !'
// };