const repositories = require("./repositoryIndex");
const logger = require("../utils/logger");

function loadRepositories() {

    try {

        const names = Object.keys(repositories);

        logger.info(`Repositories loaded: ${names.join(", ")}`);

        return repositories;

    } catch (error) {

        logger.error("Repository loading failed:", error);

        return null;

    }
}

module.exports = {
    loadRepositories
};