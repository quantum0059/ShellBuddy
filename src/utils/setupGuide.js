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

    console.log('1. Hybrid Mode (Recommended) - Best of both worlds');
    console.log('   • Uses local AI first (private, offline)');
    console.log('   • Falls back to cloud AI when needed');
    console.log('   • Setup: Configure both options below\n');

    console.log('2. Cloud AI (Gemini) - Fastest, requires API key');
    console.log('   • Get free key: https://aistudio.google.com');
    console.log('   • Add to .env: GEMINI_API_KEY=your_key');
    console.log('   • Set: SHELLBUDDY_AI_BACKEND=gemini\n');

    console.log('3. Local AI (Ollama) - Private, works offline');
    console.log('   • Install: curl -fsSL https://ollama.ai/install.sh | sh');
    console.log('   • Start server: ollama serve');
    console.log(`   • Pull model: ollama pull ${suggestedModel}`);
    console.log('   • Set: SHELLBUDDY_AI_BACKEND=ollama\n');

    console.log('═'.repeat(50));
    console.log('💡 Quick Start (Hybrid Mode):');
    console.log('   1. Add GEMINI_API_KEY to .env (cloud backup)');
    console.log('   2. Install Ollama + pull a model (local primary)');
    console.log('   3. Keep SHELLBUDDY_AI_BACKEND=auto (default)\n');
    console.log('💡 Tip: Set environment variables in ~/.bashrc for persistence');
    console.log();
}

module.exports = { showSetupGuide, getSystemRAM, suggestModel };