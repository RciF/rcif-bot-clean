/**
 * AI Brain System (PRODUCTION STABLE)
 */

const economyRepository = require("../repositories/economyRepository")
const memoryRepository = require("../repositories/memoryRepository")
const aiDecisionSystem = require("./aiDecisionSystem")
const logger = require("./loggerSystem")

const MAX_TRANSFER = 100000
const MAX_BUY_QUANTITY = 50

const cooldowns = new Map()
const GLOBAL_COOLDOWN = 2000

function checkCooldown(userId){
    const now = Date.now()
    const last = cooldowns.get(userId)

    if(last && now - last < GLOBAL_COOLDOWN){
        return true
    }

    cooldowns.set(userId, now)
    return false
}

function tryDropItem(user){
    try{
        const chance = Math.random()

        if(chance < 0.15){
            const keys = Object.keys(shopItems)
            if(!keys.length) return null

            const item = keys[Math.floor(Math.random()*keys.length)]

            if(!Array.isArray(user.inventory)){
                user.inventory = []
            }

            user.inventory.push(item)
            return item
        }

        return null
    }catch{
        return null
    }
}

function getRandomBonus(){
    const roll = Math.random()
    if(roll < 0.1) return 2
    if(roll < 0.3) return 1.5
    return 1
}

const shopItems = {
    fishing_rod: { name: "🎣 صنارة", price: 300, description: "تستخدم للصيد.", aliases:["fishing_rod","صنارة","صناره","سنارة"] },
    laptop: { name: "💻 لابتوب", price: 800, description: "جهاز عمل قوي.", aliases:["laptop","لابتوب","كمبيوتر","حاسوب"] },
    car: { name: "🚗 سيارة", price: 5000, description: "وسيلة تنقل فاخرة.", aliases:["car","سيارة","سياره"] }
}

function normalizeText(text){
    return String(text || "").toLowerCase().trim()
}

function normalizeNumbers(text){
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"}
    return String(text).replace(/[٠-٩]/g,d=>map[d])
}

function hasAny(text,words){
    return words.some(w => text.includes(w))
}

function detectIntent(message){
    try{
        const text = normalizeText(message)

        const intents = [
            ["profile",["بروفايل","profile","ملفي"]],
            ["leaderboard",["الاغنى","leaderboard","top","اغنى"]],
            ["help",["مساعدة","الاوامر","help"]],
            ["user_memory",["ماذا تعرف عني","هل تتذكرني"]],
            ["balance",["رصيدي","رصيد","balance","فلوسي"]],
            ["daily",["اليومية","daily"]],
            ["work",["اشتغل","work","وظيفة"]],
            ["transfer",["حول","transfer","تحويل"]],
            ["shop",["المتجر","shop","المحل"]],
            ["inventory",["حقيبتي","inventory","اغراضي"]],
            ["buy",["اشتري","buy","شراء"]],
            ["give",["اعط","give"]],
            ["remove",["احذف","remove","مسح"]],
            ["iteminfo",["معلومات","iteminfo","تفاصيل"]]
        ]

        for(const [intent,words] of intents){
            if(hasAny(text,words)) return intent
        }

        return null

    }catch(error){
        logger.error("AI_BRAIN_INTENT_DETECTION_FAILED",{error:error.message})
        return null
    }
}

async function ensureUser(userId){
    try{
        let user = await economyRepository.getUser(userId)

        if(!user){
            user = await economyRepository.createUser(userId)
        }

        if(!Array.isArray(user.inventory)) user.inventory=[]
        if(typeof user.coins!=="number") user.coins=0

        if(!user.last_daily) user.last_daily=0
        if(!user.last_work) user.last_work=0

        return user
    }catch(error){
        logger.error("ENSURE_USER_FAILED",{error:error.message})
        return {
            coins: 0,
            inventory: [],
            last_daily: 0,
            last_work: 0
        }
    }
}

function parseTransfer(content){
    try{
        const text = normalizeNumbers(content)
        const words = text.split(/\s+/)

        let amount=null
        let target=null

        for(const w of words){
            if(!amount && !isNaN(w)) amount=parseInt(w)
            if(w.startsWith("<@")) target=w.replace(/[<@!>]/g,"")
        }

        return {amount,target}
    }catch{
        return {amount:null,target:null}
    }
}

function parseItem(content){
    const text = normalizeText(content)

    for(const key in shopItems){
        const item = shopItems[key]
        if(item.aliases.some(a => text.includes(a))){
            return key
        }
    }

    return null
}

function parseQuantity(content){
    const text = normalizeNumbers(content)
    const match = text.match(/\d+/)

    if(!match) return 1

    const num = parseInt(match[0])

    if(num < 1) return 1
    if(num > MAX_BUY_QUANTITY) return MAX_BUY_QUANTITY

    return num
}

function parseTarget(content){
    const match = content.match(/<@!?(\d+)>/)
    return match ? match[1] : null
}

/* ===== HANDLERS ===== */

async function handleProfile(userId){
    const user = await ensureUser(userId)
    const memories = await memoryRepository.getUserMemories(userId)

    return `👤 الملف الشخصي\n\n💰 ${user.coins}\n🎒 ${user.inventory.length}\n🧠 ${memories?.length || 0}`
}

async function handleLeaderboard(){
    const users = await economyRepository.getTopUsers(10)
    if(!users?.length) return "لا يوجد بيانات"

    return "🏆\n\n" + users.map((u,i)=>`${i+1}. <@${u.user_id}> — ${u.coins}`).join("\n")
}

async function handleHelp(){
return `📜
رصيدي - اليومية - اشتغل
حول 100 @user
المتجر - اشتري
حقيبتي - الاغنى - بروفايل`
}

async function handleMemoryIntent(userId){
    const memories = await memoryRepository.getUserMemories(userId)
    if(!memories?.length) return "لا أعرفك بعد"

    return memories.slice(0,5).map(m=>`• ${m.memory}`).join("\n")
}

async function handleBalance(user){
    return `💰 ${user.coins}`
}

async function handleDaily(userId,user){
    if(checkCooldown(userId)) return "⏳"

    const now = Date.now()
    const cooldown = 86400000

    if(now-user.last_daily<cooldown){
        return "⏳ لاحقاً"
    }

    let reward=Math.floor(100 * getRandomBonus())

    user.coins+=reward
    user.last_daily=now

    const drop = tryDropItem(user)

    await economyRepository.updateUser(userId,user)

    aiDecisionSystem.applyExternalFeedback(userId,"answer","positive")

    return `💰 ${reward}${drop ? `\n🎁 ${shopItems[drop].name}`:""}`
}

async function handleWork(userId,user){
    if(checkCooldown(userId)) return "⏳"

    let reward=Math.floor((Math.random()*150+50) * getRandomBonus())

    user.coins+=reward
    user.last_work=Date.now()

    const drop = tryDropItem(user)

    await economyRepository.updateUser(userId,user)

    aiDecisionSystem.applyExternalFeedback(userId,"answer","positive")

    return `💼 ${reward}${drop ? `\n🎁 ${shopItems[drop].name}`:""}`
}

async function handleTransfer(userId,user,content){
    if(checkCooldown(userId)) return "⏳"

    const {amount,target}=parseTransfer(content)

    if(!amount||!target) return "⚠️ مثال"
    if(amount<=0) return "⚠️ غير صالح"
    if(amount>MAX_TRANSFER) return "⚠️ كبير"
    if(target===userId) return "⚠️ نفسك؟"

    const targetUser=await ensureUser(target)

    if(user.coins<amount) return "❌"

    user.coins-=amount
    targetUser.coins+=amount

    await economyRepository.updateUser(userId,user)
    await economyRepository.updateUser(target,targetUser)

    aiDecisionSystem.applyExternalFeedback(userId,"controlled","positive")

    return `💸 ${amount}`
}

async function handleShop(){
    return Object.values(shopItems).map(i=>`${i.name} — ${i.price}`).join("\n")
}

async function handleBuy(userId,user,content){
    if(checkCooldown(userId)) return "⏳"

    const itemKey=parseItem(content)
    const quantity=parseQuantity(content)

    if(!itemKey) return "⚠️ مثال"

    const item=shopItems[itemKey]
    const total=item.price*quantity

    if(user.coins<total) return "❌"

    user.coins-=total

    for(let i=0;i<quantity;i++){
        user.inventory.push(itemKey)
    }

    await economyRepository.updateUser(userId,user)

    aiDecisionSystem.applyExternalFeedback(userId,"controlled","positive")

    return `✅ ${quantity} ${item.name}`
}

async function handleInventory(user){
    const items=user.inventory||[]
    if(!items.length) return "🎒 فارغة"

    const counts={}
    items.forEach(i=>counts[i]=(counts[i]||0)+1)

    return Object.entries(counts).map(([k,v])=>`${shopItems[k]?.name || k} × ${v}`).join("\n")
}

async function handleItemInfo(content){
    const key=parseItem(content)
    if(!key) return "⚠️"

    const item=shopItems[key]
    return `${item.name}\n${item.price}\n${item.description}`
}

async function handleGive(userId,user,content){
    const itemKey=parseItem(content)
    const target=parseTarget(content)

    if(!itemKey||!target) return "⚠️"

    const targetUser=await ensureUser(target)

    const index=user.inventory.indexOf(itemKey)
    if(index===-1) return "❌"

    user.inventory.splice(index,1)
    targetUser.inventory.push(itemKey)

    await economyRepository.updateUser(userId,user)
    await economyRepository.updateUser(target,targetUser)

    aiDecisionSystem.applyExternalFeedback(userId,"controlled","positive")

    return `🎁 <@${target}>`
}

async function handleRemove(userId,content,message){
    if(!message?.member?.permissions?.has("Administrator")){
        return "❌"
    }

    const itemKey=parseItem(content)
    const target=parseTarget(content)

    if(!itemKey||!target) return "⚠️"

    const targetUser=await ensureUser(target)

    const index=targetUser.inventory.indexOf(itemKey)
    if(index===-1) return "❌"

    targetUser.inventory.splice(index,1)

    await economyRepository.updateUser(target,targetUser)

    return `🗑️ <@${target}>`
}

async function handleIntent(intent,userId,content,message){
    try{
        const decision = await aiDecisionSystem.decide({
            message: content,
            userId,
            contextStrength: 3
        })

        if (decision === "defense") return "❌"
        if (decision === "limited") return "..."

        if(intent==="profile") return await handleProfile(userId)
        if(intent==="leaderboard") return await handleLeaderboard()
        if(intent==="help") return await handleHelp()
        if(intent==="user_memory") return await handleMemoryIntent(userId)
        if(intent==="iteminfo") return await handleItemInfo(content)

        let user = await ensureUser(userId)

        if(intent==="balance") return await handleBalance(user)
        if(intent==="daily") return await handleDaily(userId,user)
        if(intent==="work") return await handleWork(userId,user)
        if(intent==="transfer") return await handleTransfer(userId,user,content)
        if(intent==="shop") return await handleShop()
        if(intent==="buy") return await handleBuy(userId,user,content)
        if(intent==="inventory") return await handleInventory(user)
        if(intent==="give") return await handleGive(userId,user,content)
        if(intent==="remove") return await handleRemove(userId,content,message)

        return null

    }catch(error){
        logger.error("AI_BRAIN_HANDLE_INTENT_FAILED",{error:error.message})
        return "⚠️ خطأ"
    }
}

module.exports = {
    detectIntent,
    handleIntent
}