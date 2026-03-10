require("dotenv").config()

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
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
const volumes = new Map()
const loops = new Map()

function getPlayer(guildId){
if(!players.has(guildId)){
const player = createAudioPlayer()
players.set(guildId,player)
}
return players.get(guildId)
}

function createMusicEmbed(song){
return new EmbedBuilder()
.setColor("#2b2d31")
.setTitle("🎶 Now Playing")
.setDescription(`[${song.title}](${song.url})`)
}

function createButtons(){
return new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("pause").setLabel("⏯").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger)
)
}

async function playSong(guildId,connection){

const queue = queues.get(guildId)
if(!queue || queue.length===0) return

const song = queue[0]

const stream = await play.stream(song.url,{
discordPlayerCompatibility:true
})

const resource = createAudioResource(stream.stream,{
inputType:stream.type,
inlineVolume:true
})

const player = getPlayer(guildId)

const vol = volumes.get(guildId) || 1
resource.volume.setVolume(vol)

connection.subscribe(player)
player.play(resource)

const guild = client.guilds.cache.get(guildId)
const textChannel = guild.channels.cache.find(c=>c.type===0)

if(textChannel){
textChannel.send({
embeds:[createMusicEmbed(song)],
components:[createButtons()]
})
}

player.once(AudioPlayerStatus.Idle,()=>{

if(loops.get(guildId)){
playSong(guildId,connection)
return
}

queue.shift()

if(queue.length===0){
autoPlay(guildId,connection)
}else{
playSong(guildId,connection)
}

})

}

/* =================
AUTOPLAY
================= */

async function autoPlay(guildId,connection){

const queue = queues.get(guildId)
if(!queue || queue.length===0) return

const last = queue[0]

let related = await play.search(last.title,{limit:5})

if(!related.length) return

queue.push(related[Math.floor(Math.random()*related.length)])

playSong(guildId,connection)

}

/* =================
SPOTIFY SUPPORT
================= */

async function handleSpotify(url){

const data = await play.spotify(url)

if(data.type === "track"){
return [`${data.name} ${data.artists[0].name}`]
}

if(data.type === "playlist" || data.type === "album"){

const tracks = await data.all_tracks()

return tracks.map(t=>`${t.name} ${t.artists[0].name}`)

}

return []

}

/* =================
SLASH COMMANDS
================= */

const commands = [

new SlashCommandBuilder()
.setName("play")
.setDescription("تشغيل موسيقى")
.addStringOption(o=>o.setName("song").setDescription("اسم أو رابط").setRequired(true)),

new SlashCommandBuilder().setName("skip").setDescription("تخطي"),

new SlashCommandBuilder().setName("stop").setDescription("إيقاف"),

new SlashCommandBuilder().setName("pause").setDescription("إيقاف مؤقت"),

new SlashCommandBuilder().setName("resume").setDescription("استكمال"),

new SlashCommandBuilder().setName("queue").setDescription("عرض الطابور"),

new SlashCommandBuilder().setName("loop").setDescription("تكرار الأغنية"),

new SlashCommandBuilder()
.setName("volume")
.setDescription("تغيير الصوت")
.addIntegerOption(o=>o.setName("value").setDescription("1-100").setRequired(true)),

new SlashCommandBuilder().setName("nowplaying").setDescription("الأغنية الحالية")

]

const rest = new REST({version:"10"}).setToken(DISCORD_TOKEN)

async function registerCommands(){
await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands})
}

client.once("clientReady",()=>{
console.log("Bot online")
registerCommands()
})

/* =================
INTERACTIONS
================= */

client.on("interactionCreate",async interaction=>{

if(interaction.isButton()){

const player = players.get(interaction.guild.id)

if(interaction.customId==="pause"){
player.pause()
interaction.reply({content:"⏸ Paused",ephemeral:true})
}

if(interaction.customId==="skip"){
player.stop()
interaction.reply({content:"⏭ Skipped",ephemeral:true})
}

if(interaction.customId==="stop"){
const connection = getVoiceConnection(interaction.guild.id)
if(connection) connection.destroy()
interaction.reply({content:"⏹ Stopped",ephemeral:true})
}

return
}

if(!interaction.isChatInputCommand()) return

if(interaction.commandName==="play"){

const query = interaction.options.getString("song")
const voiceChannel = interaction.member.voice.channel

if(!voiceChannel){
return safeReply(interaction,"ادخل روم صوتي أولاً")
}

await interaction.deferReply()

let songs = []

if(query.includes("spotify.com")){
songs = await handleSpotify(query)
}else{
songs = [query]
}

if(!queues.has(interaction.guild.id)){
queues.set(interaction.guild.id,[])
}

const connection = joinVoiceChannel({
channelId:voiceChannel.id,
guildId:interaction.guild.id,
adapterCreator:interaction.guild.voiceAdapterCreator
})

for(const s of songs){

let results = await play.search(s,{limit:1})
if(results.length){
queues.get(interaction.guild.id).push(results[0])
}

}

if(queues.get(interaction.guild.id).length===1){
await playSong(interaction.guild.id,connection)
}

return safeEdit(interaction,`🎶 تمت إضافة ${songs.length} أغنية إلى الطابور`)
}

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