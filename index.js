require("dotenv").config()

const {
Client,
GatewayIntentBits
} = require("discord.js")

const {
joinVoiceChannel,
createAudioPlayer,
createAudioResource
} = require("@discordjs/voice")

const fs = require("fs")

const fetch = (...args) =>
import("node-fetch").then(({default: fetch}) => fetch(...args))

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OWNER_ID = process.env.OWNER_ID

const BOT_NAME = "لين"

const client = new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildVoiceStates
]
})

let premiumServers = {}

if(fs.existsSync("premium.json")){
premiumServers = JSON.parse(fs.readFileSync("premium.json"))
}

function savePremium(){
fs.writeFileSync("premium.json",JSON.stringify(premiumServers,null,2))
}

const conversations = new Map()

// =================
// AI
// =================

async function askAI(channelId,question){

if(!conversations.has(channelId)){

conversations.set(channelId,[{
role:"system",
content:
"اسمك لين. انت ذكاء اصطناعي في ديسكورد. تتكلمين بأسلوب طبيعي ولطيف. تتفاعلين مع الأعضاء بشكل مرح. صاحبك ومطورك اسمه سعود وتعاملينه بشكل مميز."
}])

}

const history = conversations.get(channelId)

history.push({
role:"user",
content:question
})

const response = await fetch(
"https://api.openai.com/v1/chat/completions",
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+OPENAI_API_KEY
},
body:JSON.stringify({
model:"gpt-4o-mini",
messages:history
})
})

const data = await response.json()

if(!data.choices) return "⚠️ حدث خطأ في الذكاء الاصطناعي"

const text = data.choices[0].message.content

history.push({
role:"assistant",
content:text
})

return text

}

// =================
// IMAGE
// =================

async function generateImage(prompt){

const response = await fetch(
"https://api.openai.com/v1/images/generations",
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+OPENAI_API_KEY
},
body:JSON.stringify({
model:"gpt-image-1",
prompt:prompt
})
})

const data = await response.json()

if(!data.data) return null

return data.data[0].url

}

// =================
// READY
// =================

client.once("clientReady",()=>{

console.log("✅ Bot is online")

})

// =================
// MESSAGE
// =================

client.on("messageCreate",async message=>{

if(message.author.bot) return

const msg = message.content.toLowerCase()

// =================
// AUTO MODERATION
// =================

const bannedWords = ["سب","شتم","قذف"]

for(const word of bannedWords){

if(msg.includes(word)){

await message.delete()

return message.channel.send(
`${message.author} 🚫 يمنع السب`
)

}

}

// =================
// AI CHAT
// =================

const mentioned = message.mentions.has(client.user)
const calledByName = msg.includes(BOT_NAME)

if(mentioned || calledByName){

let question = message.content
.replace(`<@${client.user.id}>`,"")
.replace(BOT_NAME,"")
.trim()

// إذا ما كتب سؤال

if(!question){

if(message.author.id === OWNER_ID){
return message.reply("أهلاً سعود 👑 وش تحتاج؟")
}

return message.reply("نعم؟ كيف أساعدك؟")
}

// رسالة خاصة للمالك

if(message.author.id === OWNER_ID){

question =
"المستخدم هو سعود صاحبك ومطورك. تحدثي معه بود واحترام. سؤاله: "
+ question

}

const answer = await askAI(
message.channel.id,
question
)

return message.channel.send(answer)

}

// =================
// IMAGE
// =================

if(msg.startsWith("!image")){

const prompt = message.content.replace("!image","")

const img = await generateImage(prompt)

if(!img) return message.channel.send("فشل إنشاء الصورة")

return message.channel.send(img)

}

// =================
// SERVER STATS
// =================

if(msg === "!stats"){

return message.channel.send(
`📊 السيرفرات: ${client.guilds.cache.size}`
)

}

// =================
// PREMIUM
// =================

if(msg.startsWith("!premium")){

if(message.author.id !== OWNER_ID) return

const guildId = message.guild.id

premiumServers[guildId] = true

savePremium()

return message.channel.send("💎 تم تفعيل بريميوم")

}

// =================
// JOIN VOICE
// =================

if(msg === "!join"){

const channel = message.member.voice.channel

if(!channel) return message.reply("ادخل فويس اول")

const connection = joinVoiceChannel({
channelId:channel.id,
guildId:channel.guild.id,
adapterCreator:channel.guild.voiceAdapterCreator
})

const player = createAudioPlayer()

const resource = createAudioResource("./voice.mp3")

player.play(resource)

connection.subscribe(player)

message.reply("🎤 دخلت الفويس وشغلت الصوت")

}

})

client.login(DISCORD_TOKEN)