const logger = require("./loggerSystem");
const databaseManager = require("../utils/databaseManager");
const migrationSystem = require("./migrationSystem");

async function startupSystem() {

  logger.info("STARTUP_SYSTEM_INITIALIZING");

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {

    logger.warn("DATABASE_URL_NOT_SET_RUNNING_WITHOUT_DATABASE");
    logger.info("STARTUP_SYSTEM_COMPLETED");

    return;

  }

  try {

    logger.info("DATABASE_CONNECTING");

    await databaseManager.initDatabase(dbUrl);

    const dbTime = await databaseManager.testConnection();

    logger.success("DATABASE_CONNECTED");

    if (dbTime) {

      const timeValue =
        dbTime.now ||
        dbTime.time ||
        dbTime;

      if (timeValue) {
        logger.info(`DATABASE_TIME ${timeValue}`);
      }

    }

    logger.info("RUNNING_DATABASE_MIGRATIONS");

   await migrationSystem.runMigrations();

  logger.success("DATABASE_MIGRATIONS_COMPLETED");

  const addStreakMigration = require("../scripts/migrations/addStreak")
  await addStreakMigration()

  } catch (error) {

    logger.error("DATABASE_INITIALIZATION_FAILED", {
      error: error.message,
      stack: error.stack
    });

    throw error;

  }

  logger.info("STARTUP_SYSTEM_COMPLETED");

}

module.exports = startupSystem;