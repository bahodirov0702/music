const { Telegraf } = require("telegraf");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static"); // Linux va Windows uchun avtomatik yo‘l
const ytdlp = require("yt-dlp-exec");        // yt-dlp’ni Linux’da ishlatish uchun

// ⚠️ Tokenni maxfiy saqlash uchun Render’da Environment Variables ichiga qo‘y
const TelegramToken = "8305659712:AAEvTCPdFd9d8y2f10B5k-8pzI6BPHgrP2";
const bot = new Telegraf(TelegramToken);

bot.start((ctx) => ctx.reply("🎵 Menga YouTube, Instagram yoki TikTok link yuboring"));

bot.on("text", async (ctx) => {
  const url = ctx.message.text.trim();

  if (
    !url.includes("youtube.com") &&
    !url.includes("youtu.be") &&
    !url.includes("instagram.com") &&
    !url.includes("tiktok.com")
  ) {
    return ctx.reply("❌ Faqat YouTube, Instagram yoki TikTok link yuboring!");
  }

  ctx.reply("🎧 Yuklanmoqda, biroz kuting...");

  const fileName = `audio_${Date.now()}.mp3`;
  const outputPath = path.join(__dirname, fileName);

  try {
    // yt-dlp orqali audio yuklab olish
    await ytdlp(url, {
      extractAudio: true,
      audioFormat: "mp3",
      output: outputPath,
      ffmpegLocation: ffmpegPath,
    });

    // Fayl mavjud bo‘lsa, yuborish
    if (fs.existsSync(outputPath)) {
      await ctx.replyWithAudio({ source: outputPath });
      fs.unlinkSync(outputPath);
    } else {
      ctx.reply("⚠️ Audio fayl topilmadi!");
    }
  } catch (error) {
    console.error("❌ Yuklashda xato:", error);
    ctx.reply("⚠️ Yuklashda xatolik yuz berdi!");
  }
});

bot.launch();
console.log("🤖 Bot ishga tushdi...");
