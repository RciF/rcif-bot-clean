module.exports = {

  info(message, data = null) {

    if (data) {
      console.log(`ℹ️ ${message}`, data)
      return
    }

    console.log(`ℹ️ ${message}`)
  },

  success(message, data = null) {

    if (data) {
      console.log(`✅ ${message}`, data)
      return
    }

    console.log(`✅ ${message}`)
  },

  error(message, data = null) {

    if (data) {
      console.error(`❌ ${message}`, data)
      return
    }

    console.error(`❌ ${message}`)
  },

  warn(message, data = null) {

    if (data) {
      console.warn(`⚠️ ${message}`, data)
      return
    }

    console.warn(`⚠️ ${message}`)
  }

}