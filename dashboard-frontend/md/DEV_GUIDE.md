# Development Guide

---

# Folder Responsibilities

commands/ → triggers  
events/ → listeners  
systems/ → logic  
repositories/ → database  
utils/ → helpers  

---

# DEVELOPMENT PROCESS

1. trigger  
2. system logic  
3. repository  
4. database  
5. response  

---

# CRITICAL RULE

Systems MUST NOT access database directly.

---

# AI SYSTEM FLOW

Event → AI System → Repository → Database

---

# COMPLETION STANDARD

A system is complete when:

- no missing logic  
- no broken flow  
- stable execution  