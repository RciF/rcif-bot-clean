require("dotenv").config()

const { Client, GatewayIntentBits } = require("discord.js")
const { REST, Routes, SlashCommandBuilder } = require("discord.js")
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice")

const play = require("play-dl")
const express = require("express")
const fs = require("fs")

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const OWNER_ID = process.env.OWNER_ID

const BOT_NAME = "لين"

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
SLASH COMMANDS
================= */

const commands = [

new SlashCommandBuilder()
.setName("help")
.setDescription("عرض الأوامر"),

new SlashCommandBuilder()
.setName("play")
.setDescription("تشغيل موسيقى")
.addStringOption(o=>
o.setName("song")
.setDescription("اسم الأغنية")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("skip")
.setDescription("تخطي الأغنية"),

new SlashCommandBuilder()
.setName("stop")
.setDescription("إيقاف الموسيقى"),

new SlashCommandBuilder()
.setName("level")
.setDescription("عرض اللفل")

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
XP SYSTEM
================= */

let xpData={}

if(fs.existsSync("xp.json")){
xpData = JSON.parse(fs.readFileSync("xp.json"))
}

function saveXP(){
fs.writeFileSync("xp.json",JSON.stringify(xpData,null,2))
}

function addXP(id){

if(!xpData[id]){
xpData[id]={xp:0,level:1}
}

xpData[id].xp+=Math.floor(Math.random()*10)+5

if(xpData[id].xp>=xpData[id].level*100){

xpData[id].xp=0
xpData[id].level++

return xpData[id].level

}

return null

}

/* =================
DASHBOARD
================= */

const app = express()

app.get("/",(req,res)=>{

res.send(`
<h1>${BOT_NAME} Bot</h1>
<p>Servers: ${client.guilds.cache.size}</p>
`)

})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{

console.log("🌐 Dashboard running on port",PORT)

})

/* =================
READY
================= */

client.once("clientReady",()=>{

console.log("✅ Bot is online")

registerCommands()

})

/* =================
INTERACTIONS
================= */

client.on("interactionCreate",async interaction=>{

if(!interaction.isChatInputCommand()) return

/* HELP */

if(interaction.commandName==="help"){

return interaction.reply(`
🤖 أوامر ${BOT_NAME}

/play تشغيل موسيقى
/skip تخطي
/stop إيقاف
/level اللفل
`)

}

/* LEVEL */

if(interaction.commandName==="level"){

const data = xpData[interaction.user.id]

if(!data){
return interaction.reply("ما عندك XP")
}

return interaction.reply(
`Level: ${data.level} | XP: ${data.xp}`
)

}

/* PLAY */

if(interaction.commandName==="play"){

const query = interaction.options.getString("song")

const voiceChannel = interaction.member.voice.channel

if(!voiceChannel){
return interaction.reply("ادخل فويس")
}

let serverQueue = queue.get(interaction.guild.id)

if(!serverQueue){

const connection = joinVoiceChannel({
channelId:voiceChannel.id,
guildId:voiceChannel.guild.id,
adapterCreator:voiceChannel.guild.voiceAdapterCreator
})

const player = createAudioPlayer()

serverQueue = {
connection,
player,
songs:[]
}

queue.set(interaction.guild.id,serverQueue)

connection.subscribe(player)

}

let song

if(play.yt_validate(query)==="video"){

song = {url:query}

}else{

const result = await play.search(query,{limit:1})

song = {url:result[0].url}

}

serverQueue.songs.push(song)

if(serverQueue.songs.length===1){
playMusic(interaction.guild,song)
}

interaction.reply("🎵 تم تشغيل الأغنية")

}

/* SKIP */

if(interaction.commandName==="skip"){

const serverQueue = queue.get(interaction.guild.id)

if(!serverQueue){
return interaction.reply("لا يوجد موسيقى")
}

serverQueue.player.stop()

interaction.reply("⏭️ تم التخطي")

}

/* STOP */

if(interaction.commandName==="stop"){

const serverQueue = queue.get(interaction.guild.id)

if(!serverQueue){
return interaction.reply("لا يوجد موسيقى")
}

serverQueue.connection.destroy()

queue.delete(interaction.guild.id)

interaction.reply("⏹️ تم الإيقاف")

}

})

/* =================
XP MESSAGES
================= */

client.on("messageCreate",message=>{

if(message.author.bot) return

const levelUp = addXP(message.author.id)

if(levelUp){

message.channel.send(
`🎉 ${message.author} وصلت لفل ${levelUp}`
)

saveXP()

}

})

/* =================
LOGIN
================= */

client.login(DISCORD_TOKEN)