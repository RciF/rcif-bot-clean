# Project Architecture

The Bot Core uses a strict layered architecture designed for scalability, maintainability, and long-term development.

Commands
→ Systems
→ Repositories
→ databaseSystem
→ databaseManager
→ PostgreSQL

All system components must follow this structure.

---

# Architecture Goals

The architecture is designed to ensure:

* clear separation of concerns
* scalable system expansion
* safe database access
* predictable system behavior
* modular AI development

Each layer has a clearly defined responsibility and must not bypass other layers.

---

# Commands Layer

Handles Discord commands triggered by users.

Responsibilities:

* validate input
* enforce permissions
* call systems
* return responses

Commands must remain lightweight and contain **no business logic**.

Examples:

commands/admin
commands/economy
commands/moderation
commands/ai

Commands should only orchestrate system calls.

---

# Events Layer

Handles Discord gateway events.

Examples:

ready.js
interactionCreate.js
messageCreate.js
guildCreate.js

Responsibilities:

* receive Discord events
* forward events to the appropriate systems
* avoid heavy logic

Example flow:

Discord Event
→ Event Handler
→ System

---

# Systems Layer

Contains the main runtime logic of the platform.

Systems implement application behavior and coordinate repositories and utilities.

Examples:

commandHandler.js
eventHandler.js
startupSystem.js
loggerSystem.js
backupSystem.js
apiServerSystem.js

AI systems:

aiHandler.js
aiAutoReplySystem.js
aiRateLimitSystem.js
aiTokenUsageSystem.js
aiBrainSystem.js

Gameplay systems:

economySystem.js
shopSystem.js
inventorySystem.js
xpSystem.js
levelSystem.js

Moderation systems:

warningSystem.js
permissionSystem.js
settingsSystem.js

Monitoring systems:

analyticsSystem.js
healthSystem.js
metricsSystem.js
statusSystem.js
uptimeSystem.js

Infrastructure systems:

databaseHealthSystem.js
databaseStatsSystem.js
repositoryHealthSystem.js

Systems must not access the database directly.

All database access must go through repositories.

---

# Repository Layer

Repositories provide structured access to the database.

Responsibilities:

* execute queries
* map database data
* isolate database logic from systems

Examples:

memoryRepository.js
knowledgeRepository.js
economyRepository.js
xpRepository.js
userRepository.js

Note: userRepository.js was moved from systems/ to repositories/

Systems call repositories to read or modify persistent data.

---

# Database Layer

Provides low-level database access and connection management.

Components:

databaseManager.js
databaseSystem.js
migrationSystem.js

Responsibilities:

* manage PostgreSQL connection pool
* execute queries safely
* run database migrations
* expose database utilities to repositories

Provider: Supabase
Database: PostgreSQL

---

# Utilities Layer

Utility modules provide shared helpers used across the system.

Examples:

guildManager.js
dataManager.js
memoryManager.js
logger.js
databaseManager.js

Utilities must remain lightweight and reusable.

---

# AI Intelligence Architecture

The AI subsystem operates as a multi-layer intelligence engine.

Components:

AI Identity System
AI Personality System
AI Context System
AI Response Formatter System

AI Runtime Systems:

aiHandler
aiAutoReplySystem
aiBrainSystem

AI Intelligence Systems:

aiMemorySystem
aiKnowledgeSystem
aiObservationSystem
aiSocialGraphSystem

This architecture enables:

* contextual conversations
* long-term memory
* semantic knowledge retrieval
* server awareness
* social relationship detection

---

# System Interaction Flow

Typical request flow:

User Interaction
→ Command or Event
→ System
→ Repository
→ Database
→ System Response
→ Discord Message
