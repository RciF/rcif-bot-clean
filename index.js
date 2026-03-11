/* =====================================================
PART 1 - CONFIG + IMPORTS
===================================================== */

require("dotenv").config()

const { 
Client, 
GatewayIntentBits, 
EmbedBuilder, 
ActionRowBuilder, 
ButtonBuilder, 
ButtonStyle, 
PermissionFlagsBits,
StringSelectMenuBuilder
} = require("discord.js")

const { REST, Routes, SlashCommandBuilder } = require("discord.js")

const { 
joinVoiceChannel,
createAudioPlayer,
createAudioResource,
getVoiceConnection,
AudioPlayerStatus,
entersState,
VoiceConnectionStatus
} = require("@discordjs/voice")

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

/* مكتبة تشغيل الصوت القديمة (لن نحذفها) */
const play = require("play-dl")

play.setToken({
youtube:{
cookie:process.env.YT_COOKIE
}
})

/* =====================================================
ENV VARIABLES
===================================================== */

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
WEB SERVER (Render Port Binding)
===================================================== */

const app = express()

app.get("/",(req,res)=>{
res.send("Bot running")
})

app.listen(process.env.PORT || 10000,()=>{
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
"Authorization":"Bearer "+OPENAI_API_KEY
},

body:JSON.stringify({

model:"gpt-4o-mini",

messages:[
{role:"system",content:"اسمك لين، بوت ديسكورد عربي."},
{role:"user",content:prompt}
],

max_tokens:500

})

})

const data = await res.json()

if(!data || !data.choices || !data.choices[0]){
console.log("AI ERROR:",data)
return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي"
}

return data.choices[0].message.content

}catch(err){

console.log("AI ERROR:",err)

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

if(!data || !data.data || !data.data[0]){
console.log("IMAGE ERROR:",data)
return null
}

return data.data[0].url

}catch(err){

console.log("IMAGE ERROR:",err)

return null

}

}

/* =====================================================
PART 4 - XP + WARNINGS
===================================================== */

let xp = {}

if(fs.existsSync("xp.json")){
try{
xp = JSON.parse(fs.readFileSync("xp.json"))
}catch(e){
xp = {}
}
}

function addXP(user){

if(!xp[user]) xp[user] = {xp:0,level:1}

xp[user].xp += 10

if(xp[user].xp >= xp[user].level*100){
xp[user].level++
}

fs.writeFileSync("xp.json",JSON.stringify(xp,null,2))

}

let warnings = {}

if(fs.existsSync("warnings.json")){
try{
warnings = JSON.parse(fs.readFileSync("warnings.json"))
}catch(e){
warnings = {}
}
}

function addWarn(user){

if(!warnings[user]) warnings[user] = 0

warnings[user]++

fs.writeFileSync("warnings.json",JSON.stringify(warnings,null,2))

return warnings[user]

}

function containsLink(text){

if(!text) return false

return text.includes("http://") || text.includes("https://")

}

/* =====================================================
PART 5 - SAFE + MEMORY
===================================================== */

async function safeReply(interaction,content){

try{

if(interaction.deferred || interaction.replied){
return interaction.followUp(content)
}else{
return interaction.reply(content)
}

}catch(e){
console.log("SAFE REPLY ERROR:",e)
}

}

function logEvent(text){

const log=`[${new Date().toLocaleString()}] ${text}\n`

fs.appendFileSync("logs.txt",log)

}

/* MEMORY */

let memory = {}

if(fs.existsSync("memory.json")){
try{
memory = JSON.parse(fs.readFileSync("memory.json"))
}catch(e){
memory = {}
}
}

function saveMemory(){
fs.writeFileSync("memory.json",JSON.stringify(memory,null,2))
}

function getChatHistory(userId){

if(!memory[userId]) memory[userId] = []

return memory[userId]

}

function addChatHistory(userId,role,content){

if(!memory[userId]) memory[userId] = []

memory[userId].push({role,content})

if(memory[userId].length > 12){
memory[userId].shift()
}

saveMemory()

}

 

/* =====================================================
PART 6 - MUSIC SYSTEM (LAVALINK)
===================================================== */

const { LavalinkManager } = require("lavalink-client")

const manager = new LavalinkManager({

nodes: [
{
id: "main",
host: "rcif-lavalink.onrender.com",
port: 443,
authorization: "rcif123",
secure: true
}
],

sendToShard: (guildId, payload) => {
const guild = client.guilds.cache.get(guildId)
if (guild) {
guild.shard.send(payload)
}
}

})

/* =====================================================
إرسال أحداث الصوت من Discord إلى Lavalink
===================================================== */

client.on("raw", (packet) => {
manager.sendRawData(packet)
})

/* =====================================================
READY EVENT
===================================================== */

client.once("ready", async () => {

console.log("Bot online")

await manager.init({
id: client.user.id,
username: client.user.username
})

})

/* =====================================================
LAVALINK EVENTS
===================================================== */

manager.on("nodeConnect", (node) => {
console.log("✅ Lavalink connected:", node.options.id)
})

manager.on("nodeError", (node, err) => {
console.log("❌ Lavalink error:", err)
})

manager.on("nodeDisconnect", (node) => {
console.log("⚠️ Lavalink disconnected:", node.options.id)
})

/* =====================================================
OLD LOCAL PLAYER SYSTEM (لم نحذفه)
===================================================== */

const queues = new Map()
const players = new Map()
const volumes = new Map()
const loops = new Map()

function getPlayer(guildId) {

if (!players.has(guildId)) {

const player = createAudioPlayer()

players.set(guildId, player)

}

return players.get(guildId)

}

/* =====================================================
PART 7 - PLAY SONG SYSTEM (LAVALINK)
===================================================== */

async function playSong(guildId, voiceChannel){

const queue = queues.get(guildId)

if(!queue || queue.length === 0) return

let song = queue[0]

try{

/* إنشاء player */

let player = manager.players.get(guildId)

if(!player){

player = manager.createPlayer({
guildId: guildId,
voiceChannelId: voiceChannel.id,
textChannelId: voiceChannel.guild.systemChannelId,
selfDeafen: true
})

await player.connect()

}

/* البحث عن الأغنية */

const node = manager.nodes.first()

const res = await node.search({
query: song.url,
source: "ytsearch"
})

if(!res || !res.tracks || res.tracks.length === 0){

queue.shift()

return playSong(guildId, voiceChannel)

}

/* إضافة للمشغل */

player.queue.add(res.tracks[0])

if(!player.playing && !player.paused){
await player.play()
}

}catch(err){

console.log("LAVALINK PLAY ERROR:", err)

queue.shift()

return playSong(guildId, voiceChannel)

}

}

/* =====================================================
PART 8 - SLASH COMMANDS
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
),

/* =================
CONTROL PANEL
================= */

new SlashCommandBuilder()
.setName("panel")
.setDescription("فتح لوحة التحكم")

]

const rest = new REST({ version:"10" }).setToken(DISCORD_TOKEN)

async function registerCommands(){

try{

await rest.put(
Routes.applicationCommands(CLIENT_ID),
{ body: commands.map(cmd => cmd.toJSON()) }
)

console.log("Slash commands registered")

}catch(err){

console.log("COMMAND REGISTER ERROR:", err)

}

}

registerCommands()

})

/* =====================================================
PART 9 - INTERACTION HANDLER
===================================================== */

client.on("interactionCreate", async interaction => {

if(!interaction.isChatInputCommand()) return

try{

const guildId = interaction.guildId
const settings = getSettings(guildId)

/* =================
PLAY
================= */

if(interaction.commandName === "play"){

if(!settings.music){
return safeReply(interaction,"🎵 نظام الموسيقى مغلق")
}

const query = interaction.options.getString("song")
const voice = interaction.member.voice.channel

if(!voice){
return safeReply(interaction,{content:"❌ ادخل روم صوتي أولاً",flags:64})
}

await interaction.deferReply()

let player = manager.players.get(guildId)

if(!player){

player = manager.createPlayer({
guildId: guildId,
voiceChannelId: voice.id,
textChannelId: interaction.channel.id,
selfDeafen: true
})

}

if(player.state !== "CONNECTED") await player.connect()

const node = manager.nodes.find(n => n.options.id === "main")

if(!node){
return interaction.editReply("❌ Lavalink غير متصل")
}

const res = await node.search({
query: query,
source: "ytsearch"
})

if(!res || !res.tracks || res.tracks.length === 0){
return interaction.editReply("❌ لم يتم العثور على نتيجة")
}

const track = res.tracks[0]

player.queue.add(track)

if(!player.playing && !player.paused && player.queue.tracks.length === 1){
await player.play()
}

return interaction.editReply(`🎵 تمت إضافة **${track.title}**`)
}

/* =================
SKIP
================= */

else if(interaction.commandName === "skip"){

const player = manager.players.get(guildId)

if(!player || !player.queue.current){
return safeReply(interaction,{content:"❌ لا يوجد شيء يعمل",flags:64})
}

player.stop()

return safeReply(interaction,"⏭ تم التخطي")
}

/* =================
STOP
================= */

else if(interaction.commandName === "stop"){

const player = manager.players.get(guildId)

if(!player){
return safeReply(interaction,"❌ لا يوجد تشغيل")
}

player.destroy()

return safeReply(interaction,"⏹ تم الإيقاف")
}

/* =================
PAUSE
================= */

else if(interaction.commandName === "pause"){

const player = manager.players.get(guildId)

if(!player){
return safeReply(interaction,"❌ لا يوجد تشغيل")
}

player.pause(true)

return safeReply(interaction,"⏸ تم الإيقاف المؤقت")
}

/* =================
RESUME
================= */

else if(interaction.commandName === "resume"){

const player = manager.players.get(guildId)

if(!player){
return safeReply(interaction,"❌ لا يوجد تشغيل")
}

player.pause(false)

return safeReply(interaction,"▶️ تم استكمال التشغيل")
}

/* =================
QUEUE
================= */

else if(interaction.commandName === "queue"){

const player = manager.players.get(guildId)

if(!player || player.queue.tracks.length === 0){
return safeReply(interaction,"📭 الطابور فارغ")
}

const list = player.queue.tracks
.map((t,i)=>`${i+1}. ${t.title}`)
.join("\n")

return safeReply(interaction,`🎶 الطابور:\n${list}`)
}

/* =================
AI
================= */

else if(interaction.commandName === "ask"){

if(!settings.ai){
return safeReply(interaction,"🤖 نظام الذكاء الصناعي مغلق")
}

await interaction.deferReply()

const question = interaction.options.getString("question")

addChatHistory(interaction.user.id,"user",question)

const history = getChatHistory(interaction.user.id)

const prompt = history.map(m=>`${m.role}: ${m.content}`).join("\n")

const answer = await askAI(prompt)

addChatHistory(interaction.user.id,"assistant",answer)

return interaction.editReply(answer)
}

/* =================
IMAGE
================= */

else if(interaction.commandName === "image"){

await interaction.deferReply()

const prompt = interaction.options.getString("prompt")

const img = await generateImage(prompt)

if(!img){
return interaction.editReply("فشل إنشاء الصورة")
}

return interaction.editReply(img)
}

/* =================
WARN
================= */

else if(interaction.commandName === "warn"){

const user = interaction.options.getUser("user")

const count = addWarn(user.id)

return safeReply(interaction,`⚠️ تم تحذير ${user.tag} (${count})`)
}

/* =================
KICK
================= */

else if(interaction.commandName === "kick"){

const member = interaction.options.getMember("user")

await member.kick()

return safeReply(interaction,"تم طرد العضو")
}

/* =================
BAN
================= */

else if(interaction.commandName === "ban"){

const member = interaction.options.getMember("user")

await member.ban()

return safeReply(interaction,"تم حظر العضو")
}

}catch(err){

console.log("INTERACTION ERROR:",err)

try{

if(interaction.deferred){
await interaction.editReply("حدث خطأ أثناء تنفيذ الأمر")
}
else if(interaction.replied){
await interaction.followUp("حدث خطأ أثناء تنفيذ الأمر")
}
else{
await interaction.reply({content:"حدث خطأ أثناء تنفيذ الأمر",flags:64})
}

}catch(e){}

}

})

/* =====================================================
PART 10 - MESSAGE EVENTS
===================================================== */

client.on("messageCreate", async message=>{

if(message.author.bot) return
if(!message.content) return

const guildId = message.guild?.id
if(!guildId) return

const settings = getSettings(guildId)

/* =================
ROOMS ALLOWED LINKS
=================

ضع هنا ID الرومات التي تريد السماح بالروابط فيها
*/

const allowedLinkChannels = [
"1415931124290555935",
"1461018572259197018",
"1461018682569527587",
"1461019087483441285",
"1461019802301894900",
"1461020003854712962"
]

/* =================
ROLES ALLOWED LINKS
=================

ضع هنا ID الرتب التي يسمح لها بالروابط
Right Click Role
Copy Role ID
*/

const allowedLinkRoles = [
"1481053486241026179"
// "ضع هنا ايدي رتبة اخرى لاحقاً"
]

/* =================
XP SYSTEM
================= */

if(settings.xp){
addXP(message.author.id)
}

/* =================
ANTI LINK SYSTEM
================= */

if(settings.antilink && containsLink(message.content)){

/* السماح إذا كان الروم ضمن القائمة */

if(allowedLinkChannels.includes(message.channel.id)) return

/* السماح إذا كان العضو لديه رتبة مسموحة */

if(message.member.roles.cache.some(role => allowedLinkRoles.includes(role.id))) return

try{
await message.delete()
}catch(e){}

message.channel.send("🚫 الروابط غير مسموحة").catch(()=>{})

}

})

/* =====================================================
PART 11 - BUTTON HANDLER
===================================================== */

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return

try{

const guildId=interaction.guild?.id
if(!guildId) return

const player=getPlayer(guildId)

/* =================
PAUSE BUTTON
================= */

if(interaction.customId==="pause" || interaction.customId==="music_pause"){

if(!player){
return safeReply(interaction,{content:"لا يوجد تشغيل",ephemeral:true})
}

player.pause()

return safeReply(interaction,{
content:"⏸ تم الإيقاف المؤقت",
ephemeral:true
})
}

/* =================
SKIP BUTTON
================= */

if(interaction.customId==="skip" || interaction.customId==="music_skip"){

if(!player){
return safeReply(interaction,{content:"لا يوجد تشغيل",ephemeral:true})
}

player.stop()

return safeReply(interaction,{
content:"⏭ تم التخطي",
ephemeral:true
})
}

/* =================
STOP BUTTON
================= */

if(interaction.customId==="stop" || interaction.customId==="music_stop"){

queues.set(guildId,[])

const connection=getVoiceConnection(guildId)

if(connection) connection.destroy()

return safeReply(interaction,{
content:"⏹ تم إيقاف التشغيل",
ephemeral:true
})
}

}catch(err){

console.log("BUTTON HANDLER ERROR:",err)

}

})

/* =====================================================
PART 12 - SETTINGS SYSTEM
===================================================== */

let settings = {}

if(fs.existsSync("settings.json")){
try{
settings = JSON.parse(fs.readFileSync("settings.json"))
}catch(e){
console.log("SETTINGS FILE ERROR")
settings = {}
}
}

function getSettings(guildId){

if(!settings[guildId]){

settings[guildId] = {
ai: true,
memory: true,
xp: true,
antilink: true,
music: true
}

saveSettings()

}

return settings[guildId]

}

function saveSettings(){

fs.writeFileSync(
"settings.json",
JSON.stringify(settings,null,2)
)

}

function updateSetting(guildId, key, value){

if(!settings[guildId]){
getSettings(guildId)
}

settings[guildId][key] = value

saveSettings()

}

/* =====================================================
PART 13 - PANEL COMMAND
===================================================== */

client.on("interactionCreate", async interaction => {

if(!interaction.isChatInputCommand()) return

if(interaction.commandName !== "panel") return

try{

const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator)

if(!isAdmin){
return interaction.reply({
content:"❌ You need Administrator permission",
ephemeral:true
})
}

/* تحديد اللغة */

const locale = interaction.locale || "en"

const isArabic = locale.startsWith("ar")

/* النصوص */

const text = isArabic ? {

title:"🎛 لوحة التحكم",
desc:"إدارة أنظمة السيرفر",
music:"🎵 الموسيقى",
ai:"🤖 الذكاء الصناعي",
protection:"🛡 الحماية",
xp:"📊 نظام XP"

} : {

title:"🎛 Control Panel",
desc:"Manage server systems",
music:"🎵 Music",
ai:"🤖 AI",
protection:"🛡 Protection",
xp:"📊 XP System"

}

/* Embed */

const embed = new EmbedBuilder()
.setColor("#2b2d31")
.setTitle(text.title)
.setDescription(text.desc)

/* Select Menu */

const menu = new ActionRowBuilder().addComponents(

new StringSelectMenuBuilder()
.setCustomId("panel_menu")
.setPlaceholder("Select System")
.addOptions(
{
label:text.music,
value:"panel_music"
},
{
label:text.ai,
value:"panel_ai"
},
{
label:text.protection,
value:"panel_protection"
},
{
label:text.xp,
value:"panel_xp"
}
)

)

await interaction.reply({
embeds:[embed],
components:[menu]
})

}catch(err){

console.log("PANEL ERROR:",err)

}

})


/* =====================================================
PART 14 - PANEL SYSTEM
===================================================== */

client.on("interactionCreate", async interaction => {

if(!interaction.isStringSelectMenu()) return
if(interaction.customId !== "panel_menu") return

try{

const guildId = interaction.guild.id

const settings = getSettings(guildId)

/* تحديد اللغة */

const locale = interaction.locale || "en"
const isArabic = locale.startsWith("ar")

/* النصوص */

const text = isArabic ? {

music:"🎵 لوحة الموسيقى",
ai:"🤖 لوحة الذكاء الصناعي",
protection:"🛡 لوحة الحماية",
xp:"📊 لوحة XP",

loop:"تفعيل / إيقاف التكرار",
volume:"مستوى الصوت",
queue:"عرض الطابور",

ai_toggle:"تشغيل / إيقاف AI",
memory_clear:"مسح الذاكرة",

antilink:"تشغيل / إيقاف منع الروابط",

xp_toggle:"تشغيل / إيقاف XP"

} : {

music:"🎵 Music Panel",
ai:"🤖 AI Panel",
protection:"🛡 Protection Panel",
xp:"📊 XP Panel",

loop:"Toggle Loop",
volume:"Volume",
queue:"Queue",

ai_toggle:"Toggle AI",
memory_clear:"Clear Memory",

antilink:"Toggle Anti Link",

xp_toggle:"Toggle XP"

}

/* =================
MUSIC PANEL
================= */

if(interaction.values[0] === "panel_music"){

const embed = new EmbedBuilder()
.setColor("#2b2d31")
.setTitle(text.music)

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("music_pause")
.setLabel("⏯")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("music_skip")
.setLabel("⏭")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("music_stop")
.setLabel("⏹")
.setStyle(ButtonStyle.Danger)

)

return interaction.update({
embeds:[embed],
components:[row]
})

}

/* =================
AI PANEL
================= */

if(interaction.values[0] === "panel_ai"){

const embed = new EmbedBuilder()
.setColor("#2b2d31")
.setTitle(text.ai)

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("ai_toggle")
.setLabel(text.ai_toggle)
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("memory_clear")
.setLabel(text.memory_clear)
.setStyle(ButtonStyle.Secondary)

)

return interaction.update({
embeds:[embed],
components:[row]
})

}

/* =================
PROTECTION PANEL
================= */

if(interaction.values[0] === "panel_protection"){

const embed = new EmbedBuilder()
.setColor("#2b2d31")
.setTitle(text.protection)

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("antilink_toggle")
.setLabel(text.antilink)
.setStyle(ButtonStyle.Primary)

)

return interaction.update({
embeds:[embed],
components:[row]
})

}

/* =================
XP PANEL
================= */

if(interaction.values[0] === "panel_xp"){

const embed = new EmbedBuilder()
.setColor("#2b2d31")
.setTitle(text.xp)

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("xp_toggle")
.setLabel(text.xp_toggle)
.setStyle(ButtonStyle.Primary)

)

return interaction.update({
embeds:[embed],
components:[row]
})

}

}catch(err){

console.log("PANEL SYSTEM ERROR:",err)

}

})

/* =====================================================
PART 15 - PANEL BUTTON ACTIONS
===================================================== */

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return

try{

const guildId = interaction.guild?.id
if(!guildId) return

const settings = getSettings(guildId)

/* تحديد اللغة */

const locale = interaction.locale || "en"
const isArabic = locale.startsWith("ar")



/* =================
AI TOGGLE
================= */

if(interaction.customId === "ai_toggle"){

const newValue = !settings.ai

updateSetting(guildId,"ai",newValue)

return safeReply(interaction,{
content: isArabic
? `🤖 الذكاء الصناعي: ${newValue ? "مفعل" : "متوقف"}`
: `🤖 AI is now ${newValue ? "enabled" : "disabled"}`,
ephemeral:true
})

}

/* =================
CLEAR MEMORY
================= */

if(interaction.customId === "memory_clear"){

memory = {}
saveMemory()

return safeReply(interaction,{
content: isArabic
? "🧹 تم مسح ذاكرة الذكاء الصناعي"
: "🧹 AI memory cleared",
ephemeral:true
})

}

/* =================
ANTILINK TOGGLE
================= */

if(interaction.customId === "antilink_toggle"){

const newValue = !settings.antilink

updateSetting(guildId,"antilink",newValue)

return safeReply(interaction,{
content: isArabic
? `🔗 منع الروابط: ${newValue ? "مفعل" : "متوقف"}`
: `🔗 Anti Link is now ${newValue ? "enabled" : "disabled"}`,
ephemeral:true
})

}

/* =================
XP TOGGLE
================= */

if(interaction.customId === "xp_toggle"){

const newValue = !settings.xp

updateSetting(guildId,"xp",newValue)

return safeReply(interaction,{
content: isArabic
? `📊 نظام XP: ${newValue ? "مفعل" : "متوقف"}`
: `📊 XP system is now ${newValue ? "enabled" : "disabled"}`,
ephemeral:true
})

}

}catch(err){

console.log("PANEL BUTTON ERROR:", err)

}

})

/* =====================================================
PART 16 - LOGIN
===================================================== */

if(!DISCORD_TOKEN){
console.log("❌ DISCORD TOKEN NOT FOUND")
process.exit(1)
}

client.login(DISCORD_TOKEN)