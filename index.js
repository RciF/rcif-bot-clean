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
CHAT MEMORY (NEW)
================= */

function getChatHistory(userId){

if(!memory[userId]){
memory[userId] = []
}

return memory[userId]

}

function addChatHistory(userId,role,content){

if(!memory[userId]){
memory[userId] = []
}

memory[userId].push({role,content})

if(memory[userId].length > 12){
memory[userId].shift()
}

saveMemory()

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
AI CHAT (UPGRADED)
================= */

async function askAI(prompt,userId){

try{

const history = getChatHistory(userId)

const systemPrompt = `اسمك ${BOT_NAME}. 
أنت روبوت ديسكورد لطيف وذكي.
تتكلم بالعربية بشكل طبيعي وودود.
تحب مساعدة الناس.
إذا كان الشخص هو المالك تعامل معه باحترام خاص.`

const messages = [
{role:"system",content:systemPrompt},
...history,
{role:"user",content:prompt}
]

const res = await fetch("https://api.openai.com/v1/chat/completions",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${OPENAI_API_KEY}`
},
body:JSON.stringify({
model:"gpt-4.1-mini",
messages:messages
})
})

const data = await res.json()

if(!data || !data.choices){
console.log("OpenAI response:",data)
return "تعذر الحصول على رد من الذكاء الاصطناعي."
}

const reply = data.choices[0].message.content

addChatHistory(userId,"user",prompt)
addChatHistory(userId,"assistant",reply)

return reply

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

if(!data || !data.data){
console.log("Image API response:",data)
return null
}

return data.data[0].url

}catch(err){
console.log("IMAGE ERROR:",err)
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

if(interaction.commandName==="ai"){

const q = interaction.options.getString("question")

await interaction.deferReply()

const answer = await askAI(q,interaction.user.id)

return safeEdit(interaction,answer)

}

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
MENTION AI SYSTEM
================= */

client.on("messageCreate", async (message)=>{

try{

if(message.author.bot) return

if(!message.mentions.has(client.user)) return

if(checkSpam(message.author.id)){
return message.reply("⏳ حاول مرة أخرى بعد قليل.")
}

let question = message.content
.replace(`<@${client.user.id}>`,"")
.replace(`<@!${client.user.id}>`,"")
.trim()

if(!question){
return message.reply("اكتب سؤالك بعد المنشن 🙂")
}

if(isOwner(message.author.id)){
question = `المالك ${message.author.username} يسأل: ${question}`
}

await message.channel.sendTyping()

const reply = await askAI(question,message.author.id)

message.reply(reply)

logEvent(`AI mention used by ${message.author.tag}`)

}catch(err){

console.log("MENTION AI ERROR:",err)

}

})

/* =================
EXPRESS SERVER FOR RENDER
================= */

const app = express()

const PORT = process.env.PORT || 10000

app.get("/",(req,res)=>{
res.send("Bot is running")
})

app.listen(PORT,()=>{
console.log("🌐 Web server running on port",PORT)
})

/* =================
LOGIN
================= */

client.login(DISCORD_TOKEN)