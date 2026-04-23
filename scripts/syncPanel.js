require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = 'ضع_هنا_أيدي_الروم_اللي_فيه_اللوحة'; 
const MSG_ID = '1496414605575065701';

const countries = [
    { name: "السعودية", code: "SA", emoji: "🇸🇦" }, { name: "الإمارات", code: "AE", emoji: "🇦🇪" },
    { name: "الكويت", code: "KW", emoji: "🇰🇼" }, { name: "قطر", code: "QA", emoji: "🇶🇦" },
    { name: "عمان", code: "OM", emoji: "🇴🇲" }, { name: "البحرين", code: "BH", emoji: "🇧🇭" },
    { name: "اليمن", code: "YE", emoji: "🇾🇪" }, { name: "مصر", code: "EG", emoji: "🇪🇬" },
    { name: "العراق", code: "IQ", emoji: "🇮🇶" }, { name: "فلسطين", code: "PS", emoji: "🇵🇸" },
    { name: "الأردن", code: "JO", emoji: "🇯🇴" }, { name: "سوريا", code: "SY", emoji: "🇸🇾" },
    { name: "لبنان", code: "LB", emoji: "🇱🇧" }, { name: "المغرب", code: "MA", emoji: "🇲🇦" },
    { name: "الجزائر", code: "DZ", emoji: "🇩🇿" }, { name: "تونس", code: "TN", emoji: "🇹🇳" },
    { name: "ليبيا", code: "LY", emoji: "🇱🇾" }, { name: "السودان", code: "SD", emoji: "🇸🇩" },
    { name: "موريتانيا", code: "MR", emoji: "🇲🇷" }, { name: "الصومال", code: "SO", emoji: "🇸🇴" },
    { name: "جيبوتي", code: "DJ", emoji: "🇩🇯" }, { name: "جزر القمر", code: "KM", emoji: "🇰🇲" }
];

client.once('ready', async () => {
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log("🚀 بدأنا الإرسال...");

    for (const c of countries) {
        // السكربت الحين يرسل الأمر كرسالة نصية للبوت الثاني
        await channel.send(`/لوحة-رتب إضافة معرف_الرسالة:${MSG_ID} الرتبة:@${c.name} | ${c.code} النص:${c.name} الإيموجي:${c.emoji} اللون:رمادي`);
        console.log(`✅ أرسلت أمر: ${c.name}`);
        // تأخير بسيط عشان ما يتبند البوت من "السبام"
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("✨ خلصت كل الدول!");
    process.exit();
});

client.login(TOKEN);
