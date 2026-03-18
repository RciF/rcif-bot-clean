# SYSTEMS OVERVIEW

This file defines all systems and their responsibilities.

The AI must use this as a reference before modifying anything.

---

# CORE SYSTEMS

## commandHandler.js
Loads all commands from commands/ folder.

Responsibility:
- register commands  
- validate structure  

---

## eventHandler.js
Loads all events from events/ folder.

Responsibility:
- bind Discord events  
- route execution  

---

## startupSystem.js
Initializes system.

Responsibility:
- connect database  
- run migrations  
- start services  

---

## loggerSystem.js
Central logging system.

Responsibility:
- info / warn / error / success  
- system visibility  

---

# AI SYSTEMS

## aiHandler.js
Main AI engine.

Responsibility:
- build prompts  
- call OpenAI  
- manage conversation memory  

---

## aiAutoReplySystem.js
Handles message replies.

Responsibility:
- detect trigger  
- apply cooldown  
- route to AI or intent  

---

## aiBrainSystem.js
Intent engine + economy logic.

Responsibility:
- detect intent  
- execute commands  
- manage economy  

---

## aiMemorySystem.js
Memory engine.

Responsibility:
- extract memories  
- store structured data  
- inject relevant memories  

---

## aiKnowledgeSystem.js
Knowledge engine.

Responsibility:
- store semantic knowledge  
- generate embeddings  
- retrieve relevant knowledge  

---

# GAMEPLAY SYSTEMS

## economySystem.js
Controls economy availability.

---

## shopSystem.js
Handles purchases.

---

## inventorySystem.js
Manages user inventory.

---

## xpSystem.js / levelSystem.js
Handles progression.

---

# MONITORING SYSTEMS

## analyticsSystem.js
Tracks usage data.

---

## healthSystem.js
Returns system health.

---

## metricsSystem.js
Returns runtime metrics.

---

## statusSystem.js
Returns bot status.

---

## uptimeSystem.js
Tracks uptime.

---

# DATABASE LAYER

Repositories:

- userRepository  
- economyRepository  
- inventoryRepository  
- memoryRepository  
- knowledgeRepository  

Rule:

Systems MUST use repositories.

---

# SYSTEM RELATIONSHIP

User → Event → System → Repository → Database → Response

---

# COMPLETION RULE

A system is COMPLETE when:

- no missing logic  
- no unstable behavior  
- fully integrated with other systems  