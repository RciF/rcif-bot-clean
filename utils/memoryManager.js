const memoryRepository = require("../repositories/memoryRepository");

async function saveMemory(userId, text, type = "user") {
  return await memoryRepository.createMemory({
    userId,
    type,
    memory: text
  });
}

async function getMemories(userId, limit = 10) {
  return await memoryRepository.getUserMemories(userId, limit);
}

module.exports = {
  saveMemory,
  getMemories
};