require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- إعدادات هامة (تأكد منها في ملف .env) ---
const TOKEN = process.env.DISCORD_TOKEN; 
const GUILD_ID = '1490775708291694684'; 

const arabicCountries = [
    { name: "السعودية", code: "SA", color: "#2E7D32" },
    { name: "الإمارات", code: "AE", color: "#D32F2F" },
    { name: "الكويت", code: "KW", color: "#0288D1" },
    { name: "قطر", code: "QA", color: "#800000" },
    { name: "عمان", code: "OM", color: "#E53935" },
    { name: "البحرين", code: "BH", color: "#EEEEEE" },
    { name: "اليمن", code: "YE", color: "#212121" },
    { name: "مصر", code: "EG", color: "#C0CA33" },
    { name: "العراق", code: "IQ", color: "#43A047" },
    { name: "فلسطين", code: "PS", color: "#1B5E20" },
    { name: "الأردن", code: "JO", color: "#B71C1C" },
    { name: "الجزائر", code: "DZ", color: "#008751" },
    { name: "المغرب", code: "MA", color: "#C1272D" },
    { name: "تونس", code: "TN", color: "#E70013" },
    { name: "ليبيا", code: "LY", color: "#000000" },
    { name: "السودان", code: "SD", color: "#007229" },
    { name: "سوريا", code: "SY", color: "#CE1126" },
    { name: "لبنان", code: "LB", color: "#00A651" },
    { name: "موريتانيا", code: "MR", color: "#FFD700" },
    { name: "الصومال", code: "SO", color: "#4189DD" },
    { name: "جيبوتي", code: "DJ", color: "#6ABEDF" },
    { name: "جزر القمر", code: "KM", color: "#3D8E33" }
];

client.once('ready', async () => {
    console.log(`✅ متصل باسم: ${client.user.tag}`);
    
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        console.error("❌ لم يتم العثور على السيرفر! تأكد من GUILD_ID");
        process.exit();
    }

    console.log("⏳ جاري إنشاء الرتب...");

    for (const country of [...arabicCountries].reverse()) {
        try {
            await guild.roles.create({
                name: `${country.name} | ${country.code}`,
                color: country.color,
                permissions: [],
                reason: 'تجهيز رتب الدول تلقائياً'
            });
            console.log(`✅ تم إنشاء: ${country.name}`);
        } catch (err) {
            console.error(`❌ خطأ في ${country.name}:`, err.message);
        }
    }

    console.log("✨ انتهت المهمة بنجاح!");
    process.exit();
});

client.login(TOKEN);
