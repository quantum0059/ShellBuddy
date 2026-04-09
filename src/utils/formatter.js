const chalk = require("chalk");

function formatResponse(title, content) {
    const cleanedTitle = clean(title);
    const cleanedContent = clean(content);
    const lines = cleanedContent.split("\n").filter(Boolean);
    const isSingleLine = lines.length === 1;

    if (isSingleLine) {
        printCommandCard(cleanedTitle, lines[0]);
        return;
    }

    printSectionedContent(cleanedTitle, cleanedContent);
}

function printCommandCard(title, command) {
    const label = chalk.green.bold(`✓ ${title}`);
    const prompt = chalk.gray("$");
    const cmd = chalk.cyan.bold(command);

    const contentWidth = Math.max(54, stripAnsi(command).length + 10);
    const top = `┌${"─".repeat(contentWidth)}┐`;
    const mid = `├${"─".repeat(contentWidth)}┤`;
    const bottom = `└${"─".repeat(contentWidth)}┘`;

    console.log();
    console.log(chalk.gray(top));
    console.log(chalk.gray("│") + padCenter(chalk.bold(" Bash "), contentWidth) + chalk.gray("│"));
    console.log(chalk.gray(mid));
    console.log(chalk.gray("│ ") + padRight(label, contentWidth - 2) + chalk.gray("│"));
    console.log(chalk.gray("│ ") + padRight("", contentWidth - 2) + chalk.gray("│"));
    console.log(chalk.gray("│ ") + padRight(`${prompt} ${cmd}`, contentWidth - 2) + chalk.gray("│"));
    console.log(chalk.gray(bottom));
    console.log();
}

function clean(text) {
    return String(text).replace(/[*#`]/g, "").trim();
}

function printSectionedContent(title, content) {
    const sections = parseSections(content);

    console.log();
    console.log(chalk.green.bold(`✓ ${title}`));
    console.log(chalk.gray("─".repeat(62)));
    console.log();

    if (!sections.length) {
        content.split("\n").forEach((line) => console.log(chalk.white(line)));
        console.log();
        return;
    }

    sections.forEach((section, index) => {
        const normalized = normalizeHeading(section.heading);
        const heading = section.heading || "Details";
        const body = section.body.trim();

        if (isCommandHeading(normalized)) {
            const firstCommandLine = body.split("\n").find((line) => line.trim());
            if (firstCommandLine) {
                printCommandCard("Suggested Command", firstCommandLine.trim());
            }
        } else {
            console.log(colorHeading(heading, normalized));
            console.log(chalk.white(body || "No details provided."));
            if (index !== sections.length - 1) console.log();
        }
    });

    console.log();
}

function parseSections(content) {
    const rawLines = content.split("\n");
    const sections = [];
    let current = null;

    rawLines.forEach((line) => {
        const match = line.match(/^\s*([A-Za-z][A-Za-z ]{1,35})\s*:\s*(.*)$/);
        if (match) {
            if (current) sections.push(current);
            current = {
                heading: match[1].trim(),
                body: (match[2] || "").trim()
            };
            return;
        }

        if (!current) {
            current = { heading: "Details", body: line.trim() };
            return;
        }

        current.body = `${current.body}\n${line}`.trim();
    });

    if (current && current.body.trim()) sections.push(current);
    return sections;
}

function normalizeHeading(value) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isCommandHeading(value) {
    return value.includes("command");
}

function colorHeading(heading, normalized) {
    if (normalized.includes("cause")) return chalk.yellow.bold(`• ${heading}`);
    if (normalized.includes("solution") || normalized.includes("fix")) return chalk.blue.bold(`• ${heading}`);
    if (normalized.includes("breakdown")) return chalk.magenta.bold(`• ${heading}`);
    if (normalized.includes("example")) return chalk.cyan.bold(`• ${heading}`);
    return chalk.white.bold(`• ${heading}`);
}

function padRight(text, width) {
    const plainLength = stripAnsi(text).length;
    if (plainLength >= width) return text;
    return text + " ".repeat(width - plainLength);
}

function padCenter(text, width) {
    const plainLength = stripAnsi(text).length;
    if (plainLength >= width) return text;
    const totalPadding = width - plainLength;
    const left = Math.floor(totalPadding / 2);
    const right = totalPadding - left;
    return " ".repeat(left) + text + " ".repeat(right);
}

function stripAnsi(value) {
    return String(value).replace(/\u001b\[[0-9;]*m/g, "");
}

module.exports = formatResponse;