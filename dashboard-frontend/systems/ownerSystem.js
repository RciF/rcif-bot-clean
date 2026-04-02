const config = require("../config")

class OwnerSystem {

    static isOwner(userId) {
        if (!config.owners) return false

        return config.owners.includes(userId)
    }

}

module.exports = OwnerSystem