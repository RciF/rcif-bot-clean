require("dotenv").config()
const databaseManager = require("../../utils/databaseManager")
const { activatePremium } = require("../../systems/cardCustomizationSystem")

;(async () => {
  await databaseManager.initDatabase(process.env.DATABASE_URL)
  
  const result = await activatePremium("529320108032786433", "monthly", "529320108032786433")
  console.log(result)
  
  process.exit()
})()