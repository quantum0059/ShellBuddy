const {GoogleGenerativeAI} = require("@google/generative-ai");
const {getCacheResponse, setCachedResponse} = require("../utils/cache");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function askAi(prompt){
    const cached = getCacheResponse(prompt);
    if (cached !== undefined) {
        if (process.env.PSHELL_CACHE_LOG) {
            console.error("[pshell] served from cache");
        }
        
        return cached;
    }
    try {
    
        const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});
    
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        setCachedResponse(prompt, text);
        return text;
    } catch (error) {
       console.error("error in askAi", error);
       return "Failed to get response from AI";
    }
}

module.exports = askAi;