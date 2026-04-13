const os = require('os');

function getSystemRAM() {
    return Math.round(os.totalmem() / (1024 ** 3));
}

function suggestModel(ramGB) {
    if (ramGB < 8) return 'phi3:mini';
    if (ramGB < 16) return 'codellama:7b';
    return 'llama3:8b';
}

function showSetupGuide() {
    const ramGB = getSystemRAM();
    const suggestedModel = suggestModel(ramGB);

    console.log('\n⚡ ShellBuddy AI Setup');
    console.log('═'.repeat(50));
    console.log(`\nSystem: ${ramGB}GB RAM`);
    console.log(`\nChoose AI backend:\n`);

    console.log('1. Cloud AI (Fastest, requires API key)');
    console.log('   • Get free key: https://aistudio.google.com');
    console.log('   • Set: export GEMINI_API_KEY=your_key\n');

    console.log('2. Local AI (Private, offline)');
    console.log('   • Install: curl -fsSL https://ollama.ai/install.sh | sh');
    console.log(`   • Recommended model: ${suggestedModel}`);
    console.log(`   • Install model: ollama pull ${suggestedModel}`);
    console.log('   • Set: export SHELLBUDDY_AI_BACKEND=local\n');

    console.log('3. Local rules only (No AI)');
    console.log('   • Works with built-in command handlers\n');

    console.log('═'.repeat(50));
    console.log('💡 Tip: Set these in ~/.bashrc for persistence');
    console.log();
}

module.exports = { showSetupGuide, getSystemRAM, suggestModel };