import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

/**
 * Interactive REPL for SOC Analyst Workbench.
 * Maintains conversation history and loops until /exit or /quit is entered.
 */
async function startRepl() {
  console.log("==================================================");
  console.log(" 🛡️  SOC Analyst Workbench - Interactive REPL");
  console.log(" Type your prompt and press Enter.");
  console.log(" Type /exit or /quit to end session.");
  console.log("==================================================\n");

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const modelName = process.env.AZURE_OPENAI_MODEL_NAME || "gpt-5.1";

  if (!apiKey || !rawEndpoint) {
    console.error("❌ Missing required configuration in .env.");
    console.log("💡 Ensure AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are set.");
    return;
  }

  // Normalize endpoint URL
  const endpoint = rawEndpoint.replace(/\/(responses|chat\/completions)\/?$/, "").replace(/\/$/, "");

  const llm = new ChatOpenAI({
    modelName,
    apiKey,
    configuration: {
      baseURL: endpoint,
      defaultHeaders: {
        "api-key": apiKey,
      },
    },
    temperature: 0.3,
  });

  // Conversation state (messages array for memory)
  const messages: BaseMessage[] = [];

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const userInput = await rl.question("SOC-Analyst> ");
      const trimmed = userInput.trim();

      if (trimmed.toLowerCase() === "/exit" || trimmed.toLowerCase() === "/quit") {
        console.log("\n👋 Exiting SOC Analyst Workbench REPL. Session closed.");
        break;
      }

      if (!trimmed) {
        continue;
      }

      // 1. Add user prompt to conversation memory
      messages.push(new HumanMessage(trimmed));

      process.stdout.write("🤔 Assistant thinking...");
      
      // 2. Invoke LLM with full message history
      const response = await llm.invoke(messages);

      // Clear the "thinking..." indicator line
      process.stdout.write("\r\x1b[K");

      // 3. Store AI response in conversation memory
      messages.push(response);

      // 4. Output response
      console.log(`\nAssistant:\n${response.content}\n`);
    }
  } catch (error) {
    console.error("\n❌ Error during REPL session:", error);
  } finally {
    rl.close();
  }
}

startRepl();
