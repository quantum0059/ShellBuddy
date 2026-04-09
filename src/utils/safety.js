const dangerousPatterns = [
   "rm -rf /",
    "rm -rf ~",
    "mkfs",
    "dd ",
    "shutdown",
    "reboot",
];

function isDangerous(cmd){
    const lower = cmd.toLowerCase();
    return dangerousPatterns.some(pattern => lower.includes(pattern));
}

module.exports = isDangerous;