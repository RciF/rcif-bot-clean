const memoryRepository = require("../repositories/memoryRepository")

// ✅ Short-term conversation memory (in-memory)
const conversationMemory = new Map()
const MAX_MESSAGES = 12
const MAX_CONVERSATIONS = 500

function getMemory(userId) {
  return conversationMemory.get(userId) || []
}

function addMessage(userId, role, content) {
  if (!userId || !role || !content) return

  if (!conversationMemory.has(userId)) {
    conversationMemory.set(userId, [])
  }

  const memory = conversationMemory.get(userId)
  memory.push({ role, content })

  // حد الرسائل
  if (memory.length > MAX_MESSAGES) {
    memory.splice(0, memory.length - MAX_MESSAGES)
  }

  // حد المحادثات
  if (conversationMemory.size > MAX_CONVERSATIONS) {
    const firstKey = conversationMemory.keys().next().value
    conversationMemory.delete(firstKey)
  }
}

function clearMemory(userId) {
  conversationMemory.delete(userId)
}

// ✅ Long-term memory (database)
async function saveMemory(userId, text, type = "user") {
  return await memoryRepository.createMemory({
    userId,
    type,
    memory: text
  })
}

async function getMemories(userId, limit = 10) {
  return await memoryRepository.getUserMemories(userId, limit)
}

module.exports = {
  getMemory,
  addMessage,
  clearMemory,
  saveMemory,
  getMemories
}