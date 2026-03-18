const fs = require("fs")
const path = require("path")

function getFilePath(file) {

  if (!file) {
    throw new Error("DATA_FILE_REQUIRED")
  }

  return path.join(__dirname, "../data", file)

}

function load(file) {

  try {

    const filePath = getFilePath(file)

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2))
    }

    const raw = fs.readFileSync(filePath, "utf8")

    if (!raw || raw.trim() === "") {
      return {}
    }

    return JSON.parse(raw)

  } catch (error) {

    console.error("DATA_LOAD_ERROR", error)

    return {}

  }

}

function save(file, data) {

  try {

    const filePath = getFilePath(file)

    fs.writeFileSync(
      filePath,
      JSON.stringify(data || {}, null, 2)
    )

  } catch (error) {

    console.error("DATA_SAVE_ERROR", error)

  }

}

module.exports = {
  load,
  save
}