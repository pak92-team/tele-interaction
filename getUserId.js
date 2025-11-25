require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

(async () => {
  try {
    const user = await client.v2.me();  // Lấy thông tin tài khoản của bạn
    console.log('USER_ID:', user.data.id); // Đây chính là USER_ID
  } catch (error) {
    console.error('Lỗi:', error);
  }
})();
