require("dotenv").config()

const { Client, GatewayIntentBits } = require("discord.js")
const { REST, Routes, SlashCommandBuilder } = require("discord.js")
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus } = require("@discordjs/voice")

const play = require("play-dl")

play.setToken({
youtube:{cookie:""}
})

const express = require("express")
const fs = require("fs")
const fetch = require("node-fetch")
const ffmpeg = require("ffmpeg-static")

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const OWNER_ID = process.env.OWNER_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const BOT_NAME = "لين"

/* =================
SAFE INTERACTION
================= */

async function safeReply(interaction, content){
try{
if(interaction.deferred || interaction.replied){
return interaction.followUp(content)
}else{
return interaction.reply(content)
}
}catch(e){console.log(e)}
}

async function safeEdit(interaction, content){
try{
if(interaction.deferred){
return interaction.editReply(content)
}else{
return interaction.reply(content)
}
}catch(e){console.log(e)}
}

/* =================
LOG SYSTEM
================= */

function logEvent(text){
const log = `[${new Date().toLocaleString()}] ${text}\n`
fs.appendFileSync("logs.txt",log)
}

/* =================
OWNER
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
if(data.count > 10){return true}
}else{
data.count = 1
data.time = now
}

return false
}

/* =================
MEMORY
================= */

let memory={}
if(fs.existsSync("memory.json")){
memory = JSON.parse(fs.readFileSync("memory.json"))
}

function saveMemory(){
fs.writeFileSync("memory.json",JSON.stringify(memory,null,2))
}

function getChatHistory(userId){
if(!memory[userId]) memory[userId]=[]
return memory[userId]
}

function addChatHistory(userId,role,content){
if(!memory[userId]) memory[userId]=[]
memory[userId].push({role,content})
if(memory[userId].length>12) memory[userId].shift()
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
GatewayIntentBits.GuildVoiceStates
]
})

/* =================
MUSIC SYSTEM
================= */

const queues = new Map()
const players = new Map()

function getPlayer(guildId){
if(!players.has(guildId)){
const player = createAudioPlayer()
players.set(guildId,player)
}
return players.get(guildId)
}

async function playSong(guildId,connection){

const queue = queues.get(guildId)
if(!queue || queue.length===0){
return
}

const song = queue[0]

const stream = await play.stream(song.url,{
discordPlayerCompatibility:true
})

const resource = createAudioResource(stream.stream,{
inputType:stream.type,
inlineVolume:true
})

const player = getPlayer(guildId)

connection.subscribe(player)
player.play(resource)

player.once(AudioPlayerStatus.Idle,()=>{
queue.shift()
playSong(guildId,connection)
})

}

/* =================
AI CHAT
================= */

async function askAI(prompt,userId){

try{

const history = getChatHistory(userId)

const systemPrompt = `اسمك ${BOT_NAME}. روبوت ديسكورد لطيف.`

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
return "تعذر الحصول على رد."
}

const reply = data.choices[0].message.content

addChatHistory(userId,"user",prompt)
addChatHistory(userId,"assistant",reply)

return reply

}catch(err){
console.log(err)
return "خطأ في الذكاء الاصطناعي"
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
.addStringOption(o=>o.setName("song").setDescription("اسم أو رابط").setRequired(true)),

new SlashCommandBuilder().setName("skip").setDescription("تخطي"),

new SlashCommandBuilder().setName("stop").setDescription("إيقاف"),

new SlashCommandBuilder().setName("pause").setDescription("إيقاف مؤقت"),

new SlashCommandBuilder().setName("resume").setDescription("استكمال"),

new SlashCommandBuilder().setName("nowplaying").setDescription("الأغنية الحالية"),

new SlashCommandBuilder()
.setName("ai")
.setDescription("سؤال الذكاء الاصطناعي")
.addStringOption(o=>o.setName("question").setDescription("السؤال").setRequired(true))

]

const rest = new REST({version:"10"}).setToken(DISCORD_TOKEN)

async function registerCommands(){
await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands})
}

/* =================
READY
================= */

client.once("clientReady",()=>{
console.log("Bot online")
registerCommands()
})

/* =================
INTERACTIONS
================= */

client.on("interactionCreate",async interaction=>{

if(!interaction.isChatInputCommand()) return

/* PLAY */

if(interaction.commandName==="play"){

const query = interaction.options.getString("song")
const voiceChannel = interaction.member.voice.channel

if(!voiceChannel){
return safeReply(interaction,"ادخل روم صوتي أولاً")
}

await interaction.deferReply()

let results = await play.search(query,{limit:1})

if(!results.length){
return safeEdit(interaction,"لم أجد الأغنية")
}

const song = results[0]

if(!queues.has(interaction.guild.id)){
queues.set(interaction.guild.id,[])
}

queues.get(interaction.guild.id).push(song)

const connection = joinVoiceChannel({
channelId:voiceChannel.id,
guildId:interaction.guild.id,
adapterCreator:interaction.guild.voiceAdapterCreator
})

playSong(interaction.guild.id,connection)

return safeEdit(interaction,`🎶 أضيف إلى الطابور: ${song.title}`)

}

/* SKIP */

if(interaction.commandName==="skip"){
const player = players.get(interaction.guild.id)
if(player){
player.stop()
return safeReply(interaction,"⏭️ تخطي")
}
}

/* STOP */

if(interaction.commandName==="stop"){
const connection = getVoiceConnection(interaction.guild.id)
if(connection){
connection.destroy()
queues.delete(interaction.guild.id)
return safeReply(interaction,"⏹️ تم الإيقاف")
}
}

/* PAUSE */

if(interaction.commandName==="pause"){
const player = players.get(interaction.guild.id)
if(player){
player.pause()
return safeReply(interaction,"⏸️ تم الإيقاف المؤقت")
}
}

/* RESUME */

if(interaction.commandName==="resume"){
const player = players.get(interaction.guild.id)
if(player){
player.unpause()
return safeReply(interaction,"▶️ استكمال")
}
}

/* NOW PLAYING */

if(interaction.commandName==="nowplaying"){
const queue = queues.get(interaction.guild.id)
if(queue && queue.length>0){
return safeReply(interaction,`🎶 الآن: ${queue[0].title}`)
}else{
return safeReply(interaction,"لا توجد أغنية")
}
}

/* AI */

if(interaction.commandName==="ai"){
const q = interaction.options.getString("question")
await interaction.deferReply()
const answer = await askAI(q,interaction.user.id)
return safeEdit(interaction,answer)
}

})

/* =================
MENTION AI
================= */

client.on("messageCreate",async message=>{
if(message.author.bot) return
if(!message.mentions.has(client.user)) return

let question = message.content.replace(`<@${client.user.id}>`,"").trim()

const reply = await askAI(question,message.author.id)

message.reply(reply)
})

/* =================
WEB SERVER
================= */

const app = express()

app.get("/",(req,res)=>{
res.send("Bot running")
})

app.listen(process.env.PORT || 10000)

/* =================
LOGIN
================= */

client.login(DISCORD_TOKEN)