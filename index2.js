require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const schedule = require('node-schedule');


// --- Telegram bot ---
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const chatId = process.env.CHAT_ID;
const ADMIN_ID = process.env.ADMIN_ID;

// --- Tải kho tin nhắn tự động ---
const autoPosts = JSON.parse(fs.readFileSync('autopost.json', 'utf8'));
let autoIndex = 0;

// --- Load messages ---
const messages = JSON.parse(fs.readFileSync('messages.json', 'utf8'));
let messageIndex = { morning: 0, evening: 0 };

// --- Tin nhắn reply mẫu ---
const defaultReply = {
  text: "Thank you for your message! 😊\nType 'admin' or 'meet' for support.",
  photo: null
};

// --- Trạng thái admin support ---
let adminBusy = false;

function sendAutoPost() {
  const msg = autoPosts[autoIndex];

  if (msg.photo) {
    bot.sendPhoto(chatId, msg.photo, { caption: msg.text }).catch(console.error);
  } else {
    bot.sendMessage(chatId, msg.text).catch(console.error);
  }

  autoIndex = (autoIndex + 1) % autoPosts.length;

  console.log("Sent auto post:", new Date());
}

// Chạy mỗi 2–3 tiếng ngẫu nhiên
function scheduleRandomAutoPost() {
  const nextHours = Math.floor(Math.random() * 1) + 2; // 2 hoặc 3 giờ
  const nextTime = new Date(Date.now() + nextHours * 3600 * 1000);

  schedule.scheduleJob(nextTime, () => {
    sendAutoPost();
    scheduleRandomAutoPost(); // đặt lịch tiếp theo
  });

  console.log(`Next auto post scheduled in ${nextHours}h`);
}

scheduleRandomAutoPost();

// --- Gửi tin nhắn định kỳ ---
function sendScheduledMessage(type) {
  const msgArray = messages[type];
  const msg = msgArray[messageIndex[type]];

  if (msg.photo) {
    bot.sendPhoto(chatId, msg.photo, { caption: msg.text }).catch(console.error);
  } else {
    bot.sendMessage(chatId, msg.text).catch(console.error);
  }

  // Cập nhật index tuần tự, quay vòng
  messageIndex[type] = (messageIndex[type] + 1) % msgArray.length;
}

// Lịch gửi sáng 9:00 AM
schedule.scheduleJob({ hour: 9, minute: 0, tz: 'Asia/Ho_Chi_Minh' }, () => {
  sendScheduledMessage('morning');
});

// Lịch gửi chiều 6:00 PM
schedule.scheduleJob({ hour: 18, minute: 0, tz: 'Asia/Ho_Chi_Minh' }, () => {
  sendScheduledMessage('evening');
});

// --- Keyword admin/meet ---
const keywordReplies = {
  meet: 'Admin will respond shortly!',
  admin: 'Admin has been notified!'
};

// --- Xử lý tin nhắn ---
bot.on('message', (msg) => {
  if (!msg.text) return;
  const text = msg.text.toLowerCase();

  // 1️⃣ /done chỉ admin reset trạng thái
  if (text === '/done' && msg.from.id === parseInt(ADMIN_ID)) {
    adminBusy = false;
    bot.sendMessage(msg.chat.id, "Support mode ended. Bot will reply again.");
    return;
  }

  // 2️⃣ Check keyword admin/meet
  const matchedKeyword = Object.keys(keywordReplies).find(k => text.includes(k));
  if (matchedKeyword) {
    bot.sendMessage(msg.chat.id, keywordReplies[matchedKeyword]).catch(console.error);
    bot.sendMessage(ADMIN_ID, `User @${msg.from.username || msg.from.first_name} sent: ${msg.text}`).catch(console.error);

    // bật trạng thái admin đang support
    adminBusy = true;
    return;
  }

  // 3️⃣ Nếu admin đang support → bot không reply
  if (adminBusy) return;

  // 4️⃣ Tin nhắn thường → reply mẫu
  if (defaultReply.photo) {
    bot.sendPhoto(msg.chat.id, defaultReply.photo, { caption: defaultReply.text }).catch(console.error);
  } else {
    bot.sendMessage(msg.chat.id, defaultReply.text).catch(console.error);
  }
});



// setInterval(() => {
//   sendScheduledMessage('morning'); // test tin nhắn buổi sáng
// }, 100 * 1000); // 30 giây

// setInterval(() => {
//   sendScheduledMessage('evening'); // test tin nhắn buổi chiều
// }, 100 * 1000); // 30 giây

// Lịch gửi sáng 9:00 AM
// schedule.scheduleJob({ hour: 9, minute: 0, tz: 'Asia/Ho_Chi_Minh' }, () => {
//   sendScheduledMessage('morning');
// });

// // Lịch gửi chiều 6:00 PM
// schedule.scheduleJob({ hour: 18, minute: 0, tz: 'Asia/Ho_Chi_Minh' }, () => {
//   sendScheduledMessage('evening');
// });
