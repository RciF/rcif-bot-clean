const repositories = require("./repositoryIndex");
const logger = require("../utils/logger");

function checkRepositories() {

    try {

        const names = Object.keys(repositories);

        return {
            status: "ok",
            repositories: names
        };

    } catch (error) {

        logger.error("Repository health check failed:", error);

        return {
            status: "error"
        };

    }
}

module.exports = {
    checkRepositories
};