const readline = require("readline");

function confirmExecution(command) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`Run this command? (${command}) [y/n]: `, (ans) => {
            rl.close();
            resolve(ans.toLowerCase() === "y");
        });
    });
}

module.exports = confirmExecution;
