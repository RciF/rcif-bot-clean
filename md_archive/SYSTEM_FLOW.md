# System Flow

This document explains the runtime execution flow of the system.

The Bot Core processes Discord events through multiple layered systems that provide AI intelligence, gameplay features, and monitoring.

---

# Message Processing

When a message is received in a Discord server the following pipeline is executed.

Discord Message  
→ events/messageCreate.js  
→ guildManager.getGuild  
→ aiObservationSystem.observeMessage  
→ aiSocialGraphSystem.detectRelationships  
→ aiSystem.ensureAIEnabled  
→ aiAutoReplySystem  
→ aiBrainSystem.detectIntent

At this stage the system decides whether the message should trigger an AI response or a command-like intent.

---

# AI Response Flow

User Message  
→ aiAutoReplySystem  
→ aiRateLimitSystem  
→ aiBrainSystem.detectIntent

If an intent is detected:

→ aiBrainSystem.handleIntent  
→ system response generated  
→ message sent to Discord

If no intent is detected:

→ aiTokenUsageSystem  
→ aiHandler  
→ aiMemorySystem.injectMemoriesIntoContext  
→ aiKnowledgeSystem.injectKnowledge  
→ OpenAI API  
→ aiResponseFormatterSystem  
→ response stored in conversation memory  
→ message sent to Discord

This flow allows the AI to combine memory, knowledge, and context before generating responses.

---

# XP / Level Flow

When a message is posted, the leveling system may also process the message.

Discord Message  
→ xpSystem.ensureXPEnabled  
→ levelSystem.addXP (with internal cooldown protection)  
→ level calculation  
→ level up event  
→ level up message sent

This enables progression systems within the server.

---

# Memory Flow

The AI memory system stores structured user information extracted from conversations.

Message  
→ aiMemorySystem.extractMemoryFromMessage  
→ memory classification  
→ duplicate detection  
→ memory storage (memoryRepository)

During conversations:

User Message  
→ aiMemorySystem.searchRelevantMemories  
→ relevant memories injected into prompt

This enables long-term contextual awareness.

---

# Knowledge Flow

The knowledge system allows the AI to learn structured information from conversations.

Message  
→ aiKnowledgeSystem.learnFromMessage  
→ embedding generation (OpenAI embeddings)  
→ knowledge storage (knowledgeRepository)

During AI responses:

User Message  
→ embedding generation  
→ semantic vector search  
→ relevant knowledge injected into AI context  
→ AI response generation

---

# Observation Flow

The observation system monitors server activity to generate contextual memories.

Message  
→ aiObservationSystem.observeMessage  
→ user activity tracking  
→ topic keyword extraction  
→ trending topic detection  
→ server memory generation

---

# Social Graph Flow

The social graph system detects relationships between members.

Message with user mentions  
→ aiSocialGraphSystem.detectRelationships  
→ interaction tracking  
→ relationship threshold detection  
→ relationship memory stored

This enables the AI to understand social dynamics inside the server.

---

# System Interaction Summary

The Bot Core processes each message through multiple subsystems simultaneously.

Discord Message  
→ Observation Systems  
→ Social Graph Systems  
→ AI Systems  
→ Gameplay Systems  
→ Memory Systems  
→ Knowledge Systems  
→ Response Generation

This architecture allows the AI to behave as a **server intelligence engine** rather than a simple chatbot.