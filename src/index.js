const { Command } = require("commander");

const explain = require("./commands/explain");
const commandGen = require("./commands/command");
const fix = require("./commands/fix");

function runCli() {
  const program = new Command();

  program
    .name("shellbuddy")
    .description("AI assistant for terminal")
    .version("1.0.0");

  program
    .command("explain <query>")
    .description("Explain a terminal command")
    .action(explain);

  program
    .command("command <query>")
    .description("Generate terminal command")
    .option("--run", "Execute the command")
    .option("--copy", "Copy command to clipboard")
    .action(commandGen);

  program
    .command("fix <issue>")
    .description("Fix a failed command or terminal error")
    .action(fix);

  program.parse();
}

module.exports = { runCli };