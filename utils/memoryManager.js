const fs = require("fs")
const path = require("path")

const MAX_MEMORY = 10
const MAX_USERS = 1000

const memory = new Map()

const memoryFile = path.join(__dirname, "../data/memory.json")

if (!fs.existsSync(memoryFile)) {
  fs.writeFileSync(memoryFile, JSON.stringify([], null, 2))
}

function sanitize(text) {

  if (!text) return ""

  return String(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500)

}

// ✅ IMPROVED: smarter cleanup (LRU-like instead of full clear)
function cleanupMemory() {

  if (memory.size <= MAX_USERS) return

  const keys = memory.keys()
  const removeCount = Math.ceil(MAX_USERS * 0.1)

  for (let i = 0; i < removeCount; i++) {
    const k = keys.next().value
    if (!k) break
    memory.delete(k)
  }

}

function addMessage(userId, role, content) {

  try {

    if (!userId || !role || !content) return

    cleanupMemory()

    const clean = sanitize(content)

    if (!clean) return

    if (!memory.has(userId)) {
      memory.set(userId, [])
    }

    const messages = memory.get(userId)

    messages.push({
      role,
      content: clean
    })

    // ✅ keep latest only (faster than shift loop on large arrays)
    if (messages.length > MAX_MEMORY) {
      memory.set(userId, messages.slice(-MAX_MEMORY))
    }

  } catch (error) {

    console.error("MEMORY_ADD_ERROR", error)

  }

}

function getMemory(userId) {

  try {

    if (!userId) return []

    if (!memory.has(userId)) {
      memory.set(userId, [])
    }

    return memory.get(userId)

  } catch (error) {

    console.error("MEMORY_GET_ERROR", error)

    return []

  }

}

function removeUserMemory(userId) {

  try {

    if (!userId) return

    memory.delete(userId)

  } catch (error) {

    console.error("MEMORY_REMOVE_ERROR", error)

  }

}

function clearMemory() {

  try {

    memory.clear()

  } catch (error) {

    console.error("MEMORY_CLEAR_ERROR", error)

  }

}

async function getAllMemories() {

  try {

    if (!fs.existsSync(memoryFile)) {
      return []
    }

    const data = fs.readFileSync(memoryFile, "utf8")

    if (!data) return []

    const parsed = JSON.parse(data)

    if (!Array.isArray(parsed)) return []

    return parsed

  } catch (error) {

    console.error("MEMORY_READ_ERROR", error)

    return []

  }

}

async function saveMemories(memories) {

  try {

    if (!Array.isArray(memories)) return

    fs.writeFileSync(
      memoryFile,
      JSON.stringify(memories, null, 2)
    )

  } catch (error) {

    console.error("MEMORY_SAVE_ERROR", error)

  }

}

module.exports = {
  addMessage,
  getMemory,
  removeUserMemory,
  clearMemory,
  getAllMemories,
  saveMemories
}