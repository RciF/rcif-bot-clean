class DevModeSystem {

    constructor() {
        this.enabled = false;
        this.ownerId = "529320108032786433";
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    isEnabled() {
        return this.enabled;
    }

    canRespond(userId) {
        if (!this.enabled) return true;

        return String(userId) === String(this.ownerId);
    }

}

module.exports = new DevModeSystem();