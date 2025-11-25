require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");
const schedule = require("node-schedule");
const axios = require("axios");
const fs = require("fs");

// Kết nối X API
const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

// Đọc danh sách tweets từ file
const tweets = JSON.parse(fs.readFileSync("./tweets.json", "utf-8"));
let currentIndex = 0; // chạy tuần tự 0 → 29 rồi lặp lại

// Lưu ID tweet để auto-reply
const postedTweetIds = [];
let repliedComments = new Set();

// Reset cache tránh spam sau 24h
setInterval(() => {
  repliedComments = new Set();
  console.log("🧹 Reset repliedComments.");
}, 24 * 60 * 60 * 1000);

// -----------------------------
// Lấy tweet theo thứ tự tuần hoàn
// -----------------------------
function getNextTweet() {
  const tweet = tweets[currentIndex];
  currentIndex = (currentIndex + 1) % tweets.length; // quay vòng
  return tweet;
}

// -----------------------------
// Đăng tweet + ảnh nếu có
// -----------------------------
async function postTweet(tweet) {
  try {
    let mediaId = null;

    if (tweet.image) {
      const response = await axios.get(tweet.image, {
        responseType: "arraybuffer",
      });
      const mediaData = Buffer.from(response.data, "binary");
      mediaId = await client.v1.uploadMedia(mediaData, { type: "png" });
    }

    const postedTweet = await client.v2.tweet({
      text: tweet.text,
      media: mediaId ? { media_ids: [mediaId] } : undefined,
    });

    console.log("✅ Đã đăng tweet:", postedTweet.data.id);
    return postedTweet.data.id;
  } catch (err) {
    console.error("❌ Lỗi đăng tweet:", err);
  }
}

// -----------------------------
// Auto reply comment
// -----------------------------
async function autoReply(replyToId, text) {
  try {
    await client.v2.reply(text, replyToId);
    console.log("💬 Đã reply:", replyToId);
  } catch (err) {
    console.error("❌ Lỗi reply:", err);
  }
}

// -----------------------------
// Check comment mới
// -----------------------------
async function checkReplies(tweetId) {
  try {
    const search = await client.v2.search(`conversation_id:${tweetId}`, {
      expansions: ["author_id"],
      "tweet.fields": ["author_id", "conversation_id"],
      max_results: 50,
    });

    const replies = await search.tweets();
    if (!Array.isArray(replies) || replies.length === 0) return;

    for (let reply of replies) {
      if (reply.author_id === process.env.X_USER_ID) continue;

      if (!repliedComments.has(reply.id)) {
        await autoReply(
          reply.id,
          "✅Really appreciate your input! Every perspective matters. \n 👉Stopping by and leaving a comment. It means a lot! 🚀"
        );
        repliedComments.add(reply.id);
      }
    }
  } catch (err) {
    console.error("❌ Lỗi check replies:", err);
  }
}

// Check comment mỗi 20 phút
setInterval(async () => {
  for (let id of postedTweetIds) {
    await checkReplies(id);
  }
}, 60 * 1000 * 20);

// ===========================
// LỊCH ĐĂNG 9H SÁNG + 9H TỐI
// ===========================

async function schedulePost() {
  const tweet = getNextTweet(); // lấy bài theo thứ tự
  const tweetId = await postTweet(tweet);
  if (tweetId) postedTweetIds.push(tweetId);
}

// 9:00 sáng
schedule.scheduleJob(
  { hour: 9, minute: 0, tz: "Asia/Ho_Chi_Minh" },
  schedulePost
);

// 21:00 tối
schedule.scheduleJob(
  { hour: 21, minute: 0, tz: "Asia/Ho_Chi_Minh" },
  schedulePost
);

// ===========================
// SCHEDULE
// ===========================

// // Lịch test 1 phút sau hiện tại
// const now = new Date();
// const testHour = now.getHours();
// const testMinute = (now.getMinutes() + 1) % 60;

// schedule.scheduleJob({ hour: testHour, minute: testMinute, tz: 'Asia/Ho_Chi_Minh' }, async () => {
//   const tweet = tweets[Math.floor(Math.random() * tweets.length)];
//   const tweetId = await postTweet(tweet);

//   if (tweetId) {
//     postedTweetIds.push(tweetId);
//   }
// });
