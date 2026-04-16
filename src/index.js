const { Command } = require("commander");
const explain = require("./commands/explain");
const commandGen = require("./commands/command");
const fix = require("./commands/fix");
const { showSetupGuide } = require("./utils/setupGuide");
const orchestrator = require("./ai/orchestrator");

require("dotenv").config();

async function runCli() {
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

    program
        .command("setup")
        .description("Show AI setup guide")
        .action(showSetupGuide);

    program
        .command("status")
        .description("Show AI backend status")
        .action(async () => {
            await orchestrator.initialize();
            const status = orchestrator.getSetupStatus();
            console.log('\n🤖 ShellBuddy AI Status');
            console.log('═'.repeat(50));
            console.log(`Backend: ${status.backend}`);
            console.log(`Active providers: ${status.providers.join(', ') || 'none'}`);
            console.log(`AI enabled: ${status.hasAI ? '✓' : '✗'}`);
            if (!status.hasAI) {
                console.log('\n💡 Run: shellbuddy setup');
            }
            console.log();
        });

    program.parse();
}

module.exports = { runCli };