const TelegramBot = require("node-telegram-bot-api");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// 🔑 Token .env faylda saqlanadi (Koyeb environment variable sifatida)
const TelegramToken = "8305659712:AAEvTCPdFd9d8y2f10B5k-8pzI6BPHgrP2I";
const bot = new TelegramBot(TelegramToken, { polling: true });

// Linuxda ffmpeg nomi oddiy "ffmpeg"
const ffmpegPath = "ffmpeg";

// 🔗 Obuna bo‘lish kerak bo‘lgan kanallar
const CHANNELS = [
  { name: "Brown Blog", link: "https://t.me/brown_blog", username: "@brown_blog" },
  { name: "DevMind Blog", link: "https://t.me/DevMind_blog", username: "@DevMind_blog" },
];

// 🔍 Barcha kanallarga obuna bo‘lganini tekshirish
async function checkAllSubscriptions(userId) {
  for (const channel of CHANNELS) {
    try {
      const member = await bot.getChatMember(channel.username, userId);
      const isSub =
        member.status === "member" ||
        member.status === "administrator" ||
        member.status === "creator";
      if (!isSub) return false;
    } catch (err) {
      console.error(`Obuna tekshirishda xato (${channel.username}):`, err);
      return false;
    }
  }
  return true;
}

// 🎬 /start buyrug‘i
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const buttons = {
    reply_markup: {
      inline_keyboard: [
        ...CHANNELS.map((ch) => [{ text: `📢 ${ch.name} kanaliga obuna bo‘lish`, url: ch.link }]),
        [{ text: "✅ Obunani tekshirish", callback_data: "check_sub" }],
      ],
    },
  };

  bot.sendMessage(
    chatId,
    "👋 Salom!\n\nBotdan foydalanish uchun quyidagi kanallarga obuna bo‘ling 👇",
    buttons
  );
});

// 🔘 Obuna tekshirish tugmasi
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data === "check_sub") {
    const subscribed = await checkAllSubscriptions(userId);

    if (subscribed) {
      bot.sendMessage(chatId, "✅ Siz barcha kanallarga obuna bo‘lgansiz! Endi menga video link yuboring 🎵");
    } else {
      const buttons = {
        reply_markup: {
          inline_keyboard: [
            ...CHANNELS.map((ch) => [{ text: `📢 ${ch.name} kanaliga obuna bo‘lish`, url: ch.link }]),
            [{ text: "🔁 Qayta tekshirish", callback_data: "check_sub" }],
          ],
        },
      };
      bot.sendMessage(chatId, "❌ Siz hali barcha kanallarga obuna bo‘lmadingiz!", buttons);
    }
  }
});

// 📩 Link yuborilganda
bot.on("message", async (msg) => {
  const url = msg.text?.trim();
  const chatId = msg.chat.id;

  if (url.startsWith("/start")) return;

  const subscribed = await checkAllSubscriptions(msg.from.id);
  if (!subscribed) {
    const buttons = {
      reply_markup: {
        inline_keyboard: [
          ...CHANNELS.map((ch) => [{ text: `📢 ${ch.name} kanaliga obuna bo‘lish`, url: ch.link }]),
          [{ text: "✅ Obunani tekshirish", callback_data: "check_sub" }],
        ],
      },
    };
    return bot.sendMessage(chatId, "❗ Avval barcha kanallarga obuna bo‘ling!", buttons);
  }

  if (
    !url ||
    (
      !url.includes("youtube.com") &&
      !url.includes("youtu.be") &&
      !url.includes("instagram.com") &&
      !url.includes("reel") &&
      !url.includes("tiktok.com")
    )
  ) {
    return bot.sendMessage(chatId, "❌ Faqat YouTube, Instagram yoki TikTok link yuboring!");
  }

  bot.sendMessage(chatId, "🎧 Yuklanmoqda... biroz kuting ⏳");

  const fileName = `audio_${Date.now()}.mp3`;
  const command = `yt-dlp -x --no-playlist --audio-format mp3 --user-agent "Mozilla/5.0" --ffmpeg-location "${ffmpegPath}" -o "${fileName}" "${url}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Xatolik:", error);

      let reason = "⚠️ Yuklashda xatolik yuz berdi!";
      if (stderr.includes("HTTP Error 403")) {
        reason = "🚫 YouTube bu videoni yuklashni taqiqlagan (403 Forbidden).";
      } else if (stderr.includes("Sign in to confirm your age")) {
        reason = "🔞 Bu video yosh chegarasiga ega, yuklab bo‘lmaydi.";
      } else if (stderr.includes("Video unavailable")) {
        reason = "❌ Video mavjud emas yoki o‘chirilgan.";
      } else if (stderr.includes("Private video")) {
        reason = "🔐 Bu video maxfiy (Private), yuklab bo‘lmaydi.";
      }

      bot.sendMessage(chatId, reason);
      return;
    }

    if (fs.existsSync(fileName)) {
      bot.sendAudio(chatId, fs.createReadStream(fileName))
        .then(() => fs.unlinkSync(fileName))
        .catch((err) => {
          console.error("Audio yuborishda xato:", err);
          bot.sendMessage(chatId, "⚠️ Audio yuborishda xato!");
        });
    } else {
      bot.sendMessage(chatId, "⚠️ Audio fayl topilmadi!");
    }
  });
});

console.log("🤖 Bot ishga tushdi...");




