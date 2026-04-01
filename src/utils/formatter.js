const chalk = require("chalk");

function formatResponse(title, content) {
    console.log(chalk.green(`\n✔ ${title}\n`));

    const sections = content.split("\n\n");

    sections.forEach(section => {
        if (section.toLowerCase().includes("cause")) {
            console.log(chalk.yellow("📌 Cause:\n") + clean(section));
        } 
        else if (section.toLowerCase().includes("solution")) {
            console.log(chalk.blue("\n🔧 Solution:\n") + clean(section));
        } 
        else if (section.toLowerCase().includes("command")) {
            console.log(chalk.cyan("\n💻 Command:\n") + clean(section));
        } 
        else {
            console.log("\n" + clean(section));
        }
    });

    console.log("\n" + "-".repeat(40));
}

function clean(text) {
    return text.replace(/[*#`]/g, "").trim();
}

module.exports = formatResponse;