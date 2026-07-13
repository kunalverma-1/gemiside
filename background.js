// Function to handle the API communication with retry logic
async function generateWithRetry(prompt, apiKey, model = "gemini-3.1-flash-lite", retries = 3) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    };
  
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        const data = await response.json();
  
        if (data.error) {
          // Retry on rate limits (429) or temporary server overload (503)
          if ((data.error.code === 503 || data.error.code === 429) && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          return { success: false, text: `API Error: ${data.error.message}` };
        }
  
        if (data.candidates && data.candidates.length > 0) {
          return { success: true, text: data.candidates[0].content.parts[0].text };
        } else {
          return { success: false, text: "Error: Unexpected data format from Gemini." };
        }
      } catch (error) {
        return { success: false, text: `Network Error: ${error.message}` };
      }
    }
  }
  
  // Global Listener for UI-to-Background communication
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generate_response") {
      
      // 1. Construct the prompt
    const systemPrompt = `You are GemiSide, a highly technical, precise AI development assistant. 
    The user has highlighted the following context from their main screen: 
    
    "${request.contextText}"
    
    Based on that context, answer the following question directly. 
    CRITICAL: Do NOT use conversational filler, greetings, or self-introductions. Start directly with the answer or solution.
    
    CODE BLOCK ENFORCEMENT RULE: You MUST wrap ALL blocks of code, programming language translations (including C++, R, Python, etc.), pseudocode examples, and code usage blocks inside triple backticks (e.g., \`\`\`cpp ... \`\`\` or \`\`\`r ... \`\`\`). NEVER output code as raw unformatted text.
    
    MATH FORMATTING RULE: ABSOLUTELY NO LATEX. Never use LaTeX formatting (like \\frac, \\times, \\text, _, ^, $, or $$). Write all math, formulas, and circuit variables using plain text and standard Unicode characters ONLY.
    
    Question: "${request.userQuery}"`;
  
      // 2. Retrieve the API key and Model from secure browser storage
      chrome.storage.local.get(['geminiApiKey', 'geminiModel'], (result) => {
        const storedKey = result.geminiApiKey;
        const model = result.geminiModel || "gemini-3.1-flash-lite"; // Default fallback
        
        if (!storedKey) {
          sendResponse({ 
            success: false, 
            text: "⚠️ Setup Required: Please click the gear icon in the header to add your Gemini API Key." 
          });
          return;
        }
  
        // 3. Trigger the fetch with the retrieved key and model
        generateWithRetry(systemPrompt, storedKey, model).then(apiResult => {
          sendResponse(apiResult);
        });
      });
  
      return true; // Keep the message channel open for the async fetch
    }
    
  });