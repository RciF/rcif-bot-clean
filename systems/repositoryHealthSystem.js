const repositories = require("./repositoryIndex");
const logger = require("./loggerSystem");

function checkRepositories() {

    try {

        const names = Object.keys(repositories);

        return {
            status: "ok",
            repositories: names
        };

    } catch (error) {

        logger.error("REPOSITORY_HEALTH_CHECK_FAILED", {
            error: error.message
        });

        return {
            status: "error"
        };

    }
}

module.exports = {
    checkRepositories
};