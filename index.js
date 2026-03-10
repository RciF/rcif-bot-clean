/* =====================================================
PART 1 - CONFIG + IMPORTS
===================================================== */

require("dotenv").config()

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js")
const { REST, Routes, SlashCommandBuilder } = require("discord.js")
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus, entersState, VoiceConnectionStatus } = require("@discordjs/voice")

/* =================
LAVALINK IMPORT (DISABLED)
================= */

// تم تعطيل Lavalink بالكامل لأننا نستخدم نظام الصوت المباشر
// const { Manager } = require("erela.js")

/* =================
KEEP RENDER ALIVE
================= */

setInterval(()=>{
  console.log("Bot alive")
},300000)

const express = require("express")
const fs = require("fs")
const fetch = require("node-fetch")
const ffmpeg = require("ffmpeg-static")

/* مكتبة تشغيل الصوت من يوتيوب */
const play = require("play-dl")

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const OWNER_ID = process.env.OWNER_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const BOT_NAME = "لين"

/* =====================================================
DISCORD CLIENT
===================================================== */

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
})

/* =====================================================
LAVALINK MANAGER (DISABLED)
===================================================== */

/*
تم تعطيل هذا القسم بالكامل لأن نظام الموسيقى الآن
يعتمد على @discordjs/voice مباشرة بدون Lavalink
*/

/* =====================================================
READY EVENT
===================================================== */

client.once("clientReady",()=>{
  console.log("Bot online")
})

/* =====================================================
WEB SERVER (Render Port Binding)
===================================================== */

const app = express()

app.get("/", (req,res)=>{
  res.send("Bot running")
})

app.listen(process.env.PORT || 10000, ()=>{
  console.log("Web server ready")
})

/* =====================================================
PART 2 - AI SYSTEM
===================================================== */

async function askAI(prompt){

try{

const res = await fetch("https://api.openai.com/v1/chat/completions",{

method:"POST",

headers:{
"Content-Type":"application/json",
"Authorization":"Bearer " + OPENAI_API_KEY
},

body:JSON.stringify({

model:"gpt-4o-mini",

messages:[
{role:"system",content:"اسمك لين، بوت ديسكورد عربي."},
{role:"user",content:prompt}
]

})

})

const data = await res.json()

if(!data || !data.choices){

console.log("AI ERROR:", data)

return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي"

}

return data.choices[0].message.content

}catch(err){

console.log("AI ERROR:", err)

return "حدث خطأ في الذكاء الاصطناعي"

}

}

/* =====================================================
PART 3 - IMAGE GENERATION
===================================================== */

async function generateImage(prompt){

try{

const res = await fetch("https://api.openai.com/v1/images/generations",{

method:"POST",

headers:{
"Content-Type":"application/json",
"Authorization":"Bearer "+OPENAI_API_KEY
},

body:JSON.stringify({

model:"gpt-image-1",
prompt:prompt,
size:"1024x1024"

})

})

const data = await res.json()

return data.data?.[0]?.url

}catch(err){

console.log(err)

return null

}

}

/* =====================================================
PART 4 - XP + WARNINGS + SERVER PROTECTION
===================================================== */

let xp = {}

if(fs.existsSync("xp.json")){
xp = JSON.parse(fs.readFileSync("xp.json"))
}

function addXP(user){

if(!xp[user]) xp[user] = { xp:0, level:1 }

xp[user].xp += 10

if(xp[user].xp >= xp[user].level * 100){
xp[user].level++
}

fs.writeFileSync("xp.json", JSON.stringify(xp,null,2))

}

let warnings = {}

if(fs.existsSync("warnings.json")){
warnings = JSON.parse(fs.readFileSync("warnings.json"))
}

function addWarn(user){

if(!warnings[user]) warnings[user] = 0

warnings[user]++

fs.writeFileSync("warnings.json", JSON.stringify(warnings,null,2))

return warnings[user]

}

function containsLink(text){
return text.includes("http://") || text.includes("https://")
}

/* =====================================================
PART 5 - SAFE + LOG + MEMORY
===================================================== */

async function safeReply(interaction, content){

try{

if(interaction.deferred || interaction.replied){
return interaction.followUp(content)
}else{
return interaction.reply(content)
}

}catch(e){
console.log(e)
}

}

async function safeEdit(interaction, content){

try{

if(interaction.deferred){
return interaction.editReply(content)
}else{
return interaction.reply(content)
}

}catch(e){
console.log(e)
}

}

function logEvent(text){

const log = `[${new Date().toLocaleString()}] ${text}\n`

fs.appendFileSync("logs.txt", log)

}

let memory = {}

if(fs.existsSync("memory.json")){
memory = JSON.parse(fs.readFileSync("memory.json"))
}

function saveMemory(){
fs.writeFileSync("memory.json", JSON.stringify(memory,null,2))
}

function getChatHistory(userId){
if(!memory[userId]) memory[userId] = []
return memory[userId]
}

function addChatHistory(userId, role, content){

if(!memory[userId]) memory[userId] = []

memory[userId].push({role,content})

if(memory[userId].length > 12) memory[userId].shift()

saveMemory()

}

/* =====================================================
PART 7 - MUSIC SYSTEM
===================================================== */

const queues = new Map()
const players = new Map()
const volumes = new Map()
const loops = new Map()

function getPlayer(guildId){

if(!players.has(guildId)){

const player = createAudioPlayer()

players.set(guildId, player)

}

return players.get(guildId)

}

/* =================
MUSIC EMBED
================= */

function createMusicEmbed(song){

return new EmbedBuilder()
.setColor("#2b2d31")
.setTitle("🎶 Now Playing")
.setDescription(`[${song.title}](${song.url})`)

}

/* =================
CONTROL BUTTONS
================= */

function createButtons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("pause")
.setLabel("⏯")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("skip")
.setLabel("⏭")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("stop")
.setLabel("⏹")
.setStyle(ButtonStyle.Danger)

)

}

/* =================
PLAY SONG ENGINE
================= */

async function playSong(guildId, connection){

const queue = queues.get(guildId)

if(!queue || queue.length === 0) return

const song = queue[0]

let stream

try{

stream = await play.stream(song.url,{
discordPlayerCompatibility:true
})

}catch(err){

console.log("STREAM ERROR:", err)

queue.shift()

return playSong(guildId, connection)

}

const resource = createAudioResource(stream.stream,{
inputType: stream.type,
inlineVolume:true
})

const player = getPlayer(guildId)

const vol = volumes.get(guildId) || 1

resource.volume.setVolume(vol)

connection.subscribe(player)

player.play(resource)

player.once(AudioPlayerStatus.Idle,()=>{

if(loops.get(guildId)){
playSong(guildId, connection)
return
}

queue.shift()

if(queue.length === 0){
return
}else{
playSong(guildId, connection)
}

})

}

/* =====================================================
PART 8 - PLAY SONG SYSTEM
===================================================== */

async function playSong(guildId, connection){

const queue = queues.get(guildId)

if(!queue || queue.length === 0) return

const song = queue[0]

let stream

try{

/* جلب معلومات الفيديو أولاً لتجنب خطأ 429 */

const info = await play.video_basic_info(song.url)

/* إنشاء الستريم من المعلومات */

stream = await play.stream_from_info(info.video_details,{
discordPlayerCompatibility:true
})

}catch(err){

console.log("STREAM ERROR:", err)

queue.shift()

return playSong(guildId, connection)

}

const resource = createAudioResource(stream.stream,{
inputType: stream.type,
inlineVolume:true
})

const player = getPlayer(guildId)

const vol = volumes.get(guildId) || 1
resource.volume.setVolume(vol)

connection.subscribe(player)

player.play(resource)

player.once(AudioPlayerStatus.Idle, ()=>{

if(loops.get(guildId)){
playSong(guildId, connection)
return
}

queue.shift()

if(queue.length === 0){
return
}else{
playSong(guildId, connection)
}

})

}

/* =====================================================
PART 9 - SLASH COMMANDS
===================================================== */

const commands = [

new SlashCommandBuilder()
.setName("play")
.setDescription("تشغيل موسيقى")
.addStringOption(o=>
o.setName("song")
.setDescription("اسم أو رابط")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("skip")
.setDescription("تخطي الأغنية"),

new SlashCommandBuilder()
.setName("stop")
.setDescription("إيقاف التشغيل"),

new SlashCommandBuilder()
.setName("pause")
.setDescription("إيقاف مؤقت"),

new SlashCommandBuilder()
.setName("resume")
.setDescription("استكمال التشغيل"),

new SlashCommandBuilder()
.setName("queue")
.setDescription("عرض الطابور"),

new SlashCommandBuilder()
.setName("loop")
.setDescription("تكرار الأغنية"),

new SlashCommandBuilder()
.setName("volume")
.setDescription("تغيير الصوت")
.addIntegerOption(o=>
o.setName("value")
.setDescription("1 - 100")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("nowplaying")
.setDescription("الأغنية الحالية"),

new SlashCommandBuilder()
.setName("ask")
.setDescription("اسأل الذكاء الاصطناعي")
.addStringOption(o=>
o.setName("question")
.setDescription("السؤال")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("image")
.setDescription("توليد صورة")
.addStringOption(o=>
o.setName("prompt")
.setDescription("وصف الصورة")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("warn")
.setDescription("تحذير عضو")
.addUserOption(o=>
o.setName("user")
.setDescription("العضو")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("kick")
.setDescription("طرد عضو")
.addUserOption(o=>
o.setName("user")
.setDescription("العضو")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("ban")
.setDescription("حظر عضو")
.addUserOption(o=>
o.setName("user")
.setDescription("العضو")
.setRequired(true)
)

]

const rest = new REST({version:"10"}).setToken(DISCORD_TOKEN)

async function registerCommands(){

try{

await rest.put(
Routes.applicationCommands(CLIENT_ID),
{ body: commands.map(cmd => cmd.toJSON()) }
)

console.log("Slash commands registered")

}catch(err){

console.log("COMMAND REGISTER ERROR:",err)

}

}

client.once("clientReady",()=>{

console.log("Bot online")

registerCommands()

})


/* =====================================================
PART 10 - INTERACTION HANDLER
===================================================== */

client.on("interactionCreate", async interaction => {

if(!interaction.isChatInputCommand()) return

try{

/* =================
PLAY
================= */

if(interaction.commandName === "play"){

await interaction.deferReply()

const query = interaction.options.getString("song")

const voice = interaction.member.voice.channel

if(!voice){

return interaction.editReply("❌ ادخل روم صوتي أولاً")

}

const connection = joinVoiceChannel({
channelId: voice.id,
guildId: interaction.guild.id,
adapterCreator: interaction.guild.voiceAdapterCreator
})

let queue = queues.get(interaction.guild.id)

if(!queue){
queue = []
queues.set(interaction.guild.id, queue)
}

queue.push({
title: query,
url: query
})

interaction.editReply(`🎵 تمت إضافة ${query}`)

playSong(interaction.guild.id, connection)

}

/* =================
SKIP
================= */

if(interaction.commandName === "skip"){

const player = getPlayer(interaction.guild.id)

player.stop()

return interaction.reply("⏭ تم التخطي")

}

/* =================
STOP
================= */

if(interaction.commandName === "stop"){

queues.set(interaction.guild.id, [])

const connection = getVoiceConnection(interaction.guild.id)

if(connection) connection.destroy()

return interaction.reply("⏹ تم الإيقاف")

}

}catch(err){

console.log("INTERACTION ERROR:",err)

if(!interaction.replied){

interaction.reply("حدث خطأ أثناء تنفيذ الأمر")

}

}

})


/* =====================================================
PART 10 - MESSAGE EVENTS
===================================================== */

client.on("messageCreate", async message=>{

if(message.author.bot) return

addXP(message.author.id)

if(containsLink(message.content)){
message.delete().catch(()=>{})
message.channel.send("🚫 الروابط غير مسموحة")
}

})



/* =====================================================
PART 11 - INTERACTIONS
===================================================== */

client.on("interactionCreate", async interaction=>{

if(!interaction.isChatInputCommand()) return

try{


/* =================
AI COMMAND
================= */

if(interaction.commandName === "ask"){

const question = interaction.options.getString("question")

await interaction.deferReply()

const reply = await askAI(question)

return interaction.editReply(reply)

}


/* =================
IMAGE COMMAND
================= */

if(interaction.commandName === "image"){

const prompt = interaction.options.getString("prompt")

await interaction.deferReply()

const img = await generateImage(prompt)

if(!img) return interaction.editReply("فشل توليد الصورة")

return interaction.editReply(img)

}


/* =================
WARN
================= */

if(interaction.commandName === "warn"){

const user = interaction.options.getUser("user")

const count = addWarn(user.id)

return interaction.reply(`⚠️ تم تحذير ${user.tag} (${count})`)

}


/* =================
KICK
================= */

if(interaction.commandName === "kick"){

const member = interaction.options.getMember("user")

await member.kick()

return interaction.reply("تم طرد العضو")

}


/* =================
BAN
================= */

if(interaction.commandName === "ban"){

const member = interaction.options.getMember("user")

await member.ban()

return interaction.reply("تم حظر العضو")

}


/* =================
PLAY MUSIC (بدون Lavalink)
================= */

if(interaction.commandName === "play"){

const query = interaction.options.getString("song")
const voiceChannel = interaction.member.voice.channel

if(!voiceChannel){
return interaction.reply("ادخل روم صوتي أولاً")
}

await interaction.deferReply()

const connection = joinVoiceChannel({
channelId: voiceChannel.id,
guildId: interaction.guild.id,
adapterCreator: interaction.guild.voiceAdapterCreator
})

let queue = queues.get(interaction.guild.id)

if(!queue){
queue = []
queues.set(interaction.guild.id, queue)
}

queue.push({
title: query,
url: query
})

await playSong(interaction.guild.id, connection)

return interaction.editReply(`🎶 تمت إضافة: ${query}`)

}


/* =================
SKIP
================= */

if(interaction.commandName === "skip"){

const queue = queues.get(interaction.guild.id)

if(!queue || queue.length === 0){
return interaction.reply("لا يوجد شيء يعمل")
}

queue.shift()

return interaction.reply("⏭ تم تخطي الأغنية")

}


/* =================
PAUSE
================= */

if(interaction.commandName === "pause"){

const player = getPlayer(interaction.guild.id)

if(!player) return interaction.reply("لا يوجد شيء يعمل")

player.pause()

return interaction.reply("⏸ تم إيقاف الموسيقى")

}


/* =================
RESUME
================= */

if(interaction.commandName === "resume"){

const player = getPlayer(interaction.guild.id)

if(!player) return interaction.reply("لا يوجد شيء يعمل")

player.unpause()

return interaction.reply("▶️ تم استكمال الموسيقى")

}


/* =================
STOP
================= */

if(interaction.commandName === "stop"){

const connection = getVoiceConnection(interaction.guild.id)

if(connection){
connection.destroy()
}

queues.delete(interaction.guild.id)

return interaction.reply("⏹ تم إيقاف الموسيقى")

}


/* =================
QUEUE
================= */

if(interaction.commandName === "queue"){

const queue = queues.get(interaction.guild.id)

if(!queue || queue.length === 0){
return interaction.reply("لا يوجد طابور")
}

let text = queue.map((t,i)=>`${i+1}. ${t.title}`).slice(0,10).join("\n")

return interaction.reply(`🎶 الطابور:\n${text}`)

}


/* =================
LOOP
================= */

if(interaction.commandName === "loop"){

loops.set(interaction.guild.id, !loops.get(interaction.guild.id))

return interaction.reply(`🔁 التكرار: ${loops.get(interaction.guild.id) ? "مفعل" : "متوقف"}`)

}


/* =================
VOLUME
================= */

if(interaction.commandName === "volume"){

const value = interaction.options.getInteger("value")

if(value < 1 || value > 100){
return interaction.reply("القيمة بين 1 و 100")
}

volumes.set(interaction.guild.id, value / 100)

return interaction.reply(`🔊 الصوت أصبح ${value}%`)

}


/* =================
NOW PLAYING
================= */

if(interaction.commandName === "nowplaying"){

const queue = queues.get(interaction.guild.id)

if(!queue || queue.length === 0){
return interaction.reply("لا يوجد شيء يعمل")
}

return interaction.reply(`🎶 الآن: ${queue[0].title}`)

}


}catch(err){

console.log("INTERACTION ERROR:",err)

if(!interaction.replied){
interaction.reply("حدث خطأ أثناء تنفيذ الأمر")
}

}

})

/* =====================================================
PART 12 - LOGIN
===================================================== */

client.login(DISCORD_TOKEN)