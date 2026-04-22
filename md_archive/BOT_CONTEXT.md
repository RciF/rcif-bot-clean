# Bot Context

This document provides a high-level overview of the Bot Core structure.

The Bot Core is the runtime intelligence engine of the Discord Production Platform.
It combines AI systems, gameplay systems, moderation tools, and monitoring infrastructure.

---

# Core Runtime Systems

These systems control the lifecycle of the bot.

commandHandler.js
eventHandler.js
startupSystem.js
loggerSystem.js
backupSystem.js
apiServerSystem.js

Responsibilities:

* initialize the bot
* load commands and events
* start infrastructure services
* handle runtime logging
* maintain operational stability

---

# AI Core Systems

These systems handle the AI conversation pipeline.

aiHandler.js
aiAutoReplySystem.js
aiRateLimitSystem.js
aiTokenUsageSystem.js
aiBrainSystem.js

Responsibilities:

* detect AI interaction triggers
* enforce usage limits
* process user intent
* route messages to AI systems
* generate responses

---

# AI Intelligence Systems

These systems provide the AI's intelligence capabilities.

aiIdentitySystem.js
aiPersonalitySystem.js
aiContextSystem.js
aiResponseFormatterSystem.js
aiObservationSystem.js
aiSocialGraphSystem.js

Capabilities:

* contextual conversations
* personality-driven responses
* server awareness
* social relationship detection
* intelligent response formatting

---

# Memory Systems

Responsible for persistent AI memory.

systems/aiMemorySystem.js
repositories/memoryRepository.js
utils/memoryManager.js

Capabilities:

* structured memory extraction
* long-term user memory
* server activity memory
* memory relevance ranking
* contextual memory injection

---

# Knowledge Systems

Responsible for semantic knowledge learning and retrieval.

systems/aiKnowledgeSystem.js
repositories/knowledgeRepository.js

Capabilities:

* semantic knowledge storage
* vector embeddings
* similarity search
* knowledge injection into prompts

---

# Gameplay Systems

These systems provide interactive server features.

economySystem.js
shopSystem.js
inventorySystem.js
xpSystem.js
levelSystem.js

Features:

* coins and economy
* daily rewards
* work commands
* item purchases
* inventory management
* leveling progression

---

# Moderation Systems

Moderation tools used to manage server members.

warningSystem.js
permissionSystem.js
settingsSystem.js

Features:

* warnings
* moderation commands
* permission validation
* server configuration

---

# Monitoring & Analytics Systems

Operational systems that monitor platform health.

analyticsSystem.js
metricsSystem.js
healthSystem.js
statusSystem.js
uptimeSystem.js

Capabilities:

* runtime metrics
* health checks
* operational analytics
* status reporting

---

# Database Systems

Responsible for persistence and data storage.

databaseManager.js
databaseSystem.js
migrationSystem.js

Repositories:

memoryRepository.js
knowledgeRepository.js
economyRepository.js
guildRepository.js
userRepository.js
inventoryRepository.js
warningRepository.js
xpRepository.js

Note: userRepository.js was moved from systems/ to repositories/

Database Provider: Supabase
Database Engine: PostgreSQL

---

# Utility Systems

Shared helper modules used across the platform.

guildManager.js
dataManager.js
memoryManager.js
logger.js
databaseManager.js

These modules provide reusable functionality across multiple systems.

---

# Bot Role

The Bot Core acts as a **server intelligence engine** capable of:

* contextual AI conversations
* long-term user memory
* semantic knowledge retrieval
* server activity observation
* social relationship analysis
* gameplay progression systems
* moderation and administration tools
