const {GoogleGenerativeAI} = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function askAi(prompt){
    try {
    
        const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});
    
        const result = await model.generateContent(prompt);
        const response = await result.response;
    
        return response.text();
    } catch (error) {
       console.error("error in askAi", error);
       return "Failed to get response from AI";
    }
}

module.exports = askAi;