const dangerousPatterns = [
    // Destructive filesystem operations
    "rm -rf /",
    "rm -rf ~",
    "rm -rf /*",
    "rm -rf /home",
    "mkfs",
    "mkfs.ext",
    "mkfs.xfs",
    "mkfs.btrfs",
    "dd if=/dev/zero",
    "dd if=/dev/random",
    "dd if=/dev/urandom",
    "> /dev/sda",
    "> /dev/nvme",
    "> /dev/hda",
    
    // System shutdown/reboot
    "shutdown",
    "reboot",
    "poweroff",
    "halt",
    "init 0",
    "init 6",
    "systemctl poweroff",
    "systemctl reboot",
    
    // Dangerous redirects
    ":(){ :|:& };:",  // Fork bomb
    "chmod -R 777 /",
    "chmod -R 000 /",
    
    // Network dangers
    "iptables -F",
    "iptables --flush",
];

const riskyPatterns = [
    // Potentially risky but sometimes needed
    "rm -rf",
    "rm -r /",
    "rm -r ~",
    "rm -f",
    "rm /",
    "rm ~",
    "dd ",
    "mv /",
    "mv ~",
    "-delete",
    "-exec rm",
    "-exec sh",
    "-exec bash",
    "> /etc/",
    "sudo rm",
];

const destructiveKeywords = [
    'delete', 'remove', 'drop', 'destroy', 'wipe', 'erase', 'clean'
];

/**
 * Check if command is dangerous (should be blocked)
 * @param {string} cmd - Command to check
 * @returns {boolean}
 */
function isDangerous(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase();
    return dangerousPatterns.some(pattern => lower.includes(pattern.toLowerCase()));
}

/**
 * Check if command is risky (should warn user)
 * @param {string} cmd - Command to check
 * @returns {boolean}
 */
function isRisky(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;
    const lower = cmd.toLowerCase();
    return riskyPatterns.some(pattern => lower.includes(pattern.toLowerCase()));
}

/**
 * Get risk level of command
 * @param {string} cmd - Command to check
 * @returns {'safe'|'risky'|'dangerous'}
 */
function getRiskLevel(cmd) {
    if (isDangerous(cmd)) return 'dangerous';
    if (isRisky(cmd)) return 'risky';
    return 'safe';
}

/**
 * Get warning message for risky command
 * @param {string} cmd - Command to check
 * @returns {string|null}
 */
function getRiskWarning(cmd) {
    const level = getRiskLevel(cmd);
    if (level === 'dangerous') {
        return '⚠️  This command is DANGEROUS and has been blocked for your safety.';
    }
    if (level === 'risky') {
        return '⚠️  This command may be DESTRUCTIVE. Please review carefully before executing.';
    }
    return null;
}

/**
 * Analyze command and provide trust indicators
 * @param {string} cmd - Command to analyze
 * @returns {{
 *   level: 'safe'|'risky'|'dangerous',
 *   warning: string|null,
 *   explanation: string
 * }}
 */
function analyzeCommand(cmd) {
    const level = getRiskLevel(cmd);
    const warning = getRiskWarning(cmd);
    
    let explanation = '';
    if (level === 'safe') {
        explanation = 'This command appears safe to execute.';
    } else if (level === 'risky') {
        explanation = 'This command could modify or delete files. Review the paths carefully.';
    } else {
        explanation = 'This command could damage your system or data.';
    }
    
    return { level, warning, explanation };
}

module.exports = {
    isDangerous,
    isRisky,
    getRiskLevel,
    getRiskWarning,
    analyzeCommand
};