require("dotenv").config()

const { Client, GatewayIntentBits } = require("discord.js")
const { REST, Routes, SlashCommandBuilder } = require("discord.js")
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice")

const play = require("play-dl")
const express = require("express")
const fs = require("fs")
const fetch = require("node-fetch")

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const OWNER_ID = process.env.OWNER_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const BOT_NAME = "لين"

/* =================
SAFE INTERACTION SYSTEM
================= */

async function safeReply(interaction, content){

try{

if(interaction.deferred || interaction.replied){
return interaction.followUp(content)
}else{
return interaction.reply(content)
}

}catch(e){
console.log("Reply prevented error")
}

}

async function safeEdit(interaction, content){

try{

if(interaction.deferred){
return interaction.editReply(content)
}else if(!interaction.replied){
return interaction.reply(content)
}else{
return interaction.followUp(content)
}

}catch(e){
console.log("Edit prevented error")
}

}

/* =================
LOG SYSTEM
================= */

function logEvent(text){
const log = `[${new Date().toLocaleString()}] ${text}\n`
fs.appendFileSync("logs.txt",log)
}

/* =================
OWNER SYSTEM
================= */

function isOwner(id){
return id === OWNER_ID
}

/* =================
ANTI SPAM
================= */

const spamMap = new Map()

function checkSpam(userId){

const now = Date.now()

if(!spamMap.has(userId)){
spamMap.set(userId,{count:1,time:now})
return false
}

const data = spamMap.get(userId)

if(now - data.time < 5000){

data.count++

if(data.count > 10){
return true
}

}else{

data.count = 1
data.time = now

}

return false
}

/* =================
MEMORY SYSTEM
================= */

let memory={}

if(fs.existsSync("memory.json")){
memory = JSON.parse(fs.readFileSync("memory.json"))
}

function saveMemory(){
fs.writeFileSync("memory.json",JSON.stringify(memory,null,2))
}

/* =================
DISCORD CLIENT
================= */

const client = new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildVoiceStates,
GatewayIntentBits.GuildMembers
]
})

/* =================
MUSIC SYSTEM
================= */

const queue = new Map()

async function playMusic(guild, song){

const serverQueue = queue.get(guild.id)

if(!song){
serverQueue.connection.destroy()
queue.delete(guild.id)
return
}

const stream = await play.stream(song.url)
const resource = createAudioResource(stream.stream)

serverQueue.player.play(resource)

}

/* =================
AI CHAT
================= */

async function askAI(prompt){

try{

const res = await fetch("https://api.openai.com/v1/chat/completions",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${OPENAI_API_KEY}`
},
body:JSON.stringify({
model:"gpt-4.1-mini",
messages:[
{role:"system",content:`اسمك ${BOT_NAME} روبوت ديسكورد لطيف.`},
{role:"user",content:prompt}
]
})
})

const data = await res.json()

return data.choices?.[0]?.message?.content || "ما قدرت أفهم."

}catch(err){

console.log("AI ERROR:", err)
return "حدث خطأ في الذكاء الاصطناعي"

}

}

/* =================
IMAGE GENERATION
================= */

async function generateImage(prompt){

try{

const res = await fetch("https://api.openai.com/v1/images/generations",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${OPENAI_API_KEY}`
},
body:JSON.stringify({
model:"gpt-image-1",
prompt:prompt,
size:"1024x1024"
})
})

const data = await res.json()

return data.data[0].url

}catch{
return null
}

}

/* =================
SLASH COMMANDS
================= */

const commands = [

new SlashCommandBuilder().setName("help").setDescription("عرض الأوامر"),

new SlashCommandBuilder()
.setName("play")
.setDescription("تشغيل موسيقى")
.addStringOption(o=>o.setName("song").setDescription("اسم الأغنية").setRequired(true)),

new SlashCommandBuilder().setName("skip").setDescription("تخطي الأغنية"),

new SlashCommandBuilder().setName("stop").setDescription("إيقاف الموسيقى"),

new SlashCommandBuilder().setName("level").setDescription("عرض اللفل"),

new SlashCommandBuilder()
.setName("ai")
.setDescription("سؤال الذكاء الاصطناعي")
.addStringOption(o=>o.setName("question").setDescription("السؤال").setRequired(true)),

new SlashCommandBuilder()
.setName("image")
.setDescription("إنشاء صورة")
.addStringOption(o=>o.setName("prompt").setDescription("وصف الصورة").setRequired(true)),

new SlashCommandBuilder().setName("join").setDescription("دخول الفويس")

]

const rest = new REST({version:"10"}).setToken(DISCORD_TOKEN)

async function registerCommands(){

try{

await rest.put(
Routes.applicationCommands(CLIENT_ID),
{body:commands}
)

console.log("✅ Slash commands registered")

}catch(err){
console.log(err)
}

}

/* =================
READY
================= */

client.once("clientReady",()=>{

console.log("✅ Bot is online")
logEvent("Bot started")

registerCommands()

})

/* =================
INTERACTIONS
================= */

client.on("interactionCreate",async interaction=>{

if(!interaction.isChatInputCommand()) return

/* HELP */

if(interaction.commandName==="help"){

return safeReply(interaction,`
🤖 أوامر ${BOT_NAME}

/play تشغيل موسيقى
/skip تخطي
/stop إيقاف
/level اللفل
/ai سؤال الذكاء الاصطناعي
/image إنشاء صورة
/join دخول الفويس
`)

}

/* AI */

if(interaction.commandName==="ai"){

const q = interaction.options.getString("question")

await interaction.deferReply()

const answer = await askAI(q)

return safeEdit(interaction,answer)

}

/* IMAGE */

if(interaction.commandName==="image"){

const prompt = interaction.options.getString("prompt")

await interaction.deferReply()

const img = await generateImage(prompt)

if(!img){
return safeEdit(interaction,"❌ فشل إنشاء الصورة")
}

return safeEdit(interaction,img)

}

})

/* =================
LOGIN
================= */

client.login(DISCORD_TOKEN)