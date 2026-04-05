const fs = require("fs");
const path = require("path");
const os = require("os");

function getLastCommand(){
    const histFile = process.env.HISTFILE || path.join(os.homedir(), ".bash_history");
    try{
        if(!fs.existsSync(histFile)) return null;
        const lines = fs.readFileSync(histFile, "utf8").trim().split("\n");
        const last = lines[lines.length - 1];
        return last ? last.trim() : null;
    }catch{
        return null;
    }
}
module.exports = { getLastCommand };