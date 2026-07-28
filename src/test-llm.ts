import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Test script for Azure OpenAI using the OpenAI v1 API format (/openai/v1/).
 * Does not require api-version query parameters.
 */
async function testAzureOpenAI() {
  console.log("🔍 Checking Azure OpenAI (v1 SDK style) configuration...");

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://<resource>.services.ai.azure.com/openai/v1
  const modelName = process.env.AZURE_OPENAI_MODEL_NAME || "gpt-5.1";

  if (!apiKey || !rawEndpoint) {
    console.error("❌ Missing required configuration in .env.");
    console.log("💡 Ensure AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are set in your .env file.");
    return;
  }

  // Strip trailing '/responses', '/chat/completions', or trailing slashes if present in .env
  const endpoint = rawEndpoint.replace(/\/(responses|chat\/completions)\/?$/, "").replace(/\/$/, "");

  console.log(`📡 Connecting to Endpoint: ${endpoint}`);
  console.log(`🧠 Model Name: ${modelName}`);

  // Using standard ChatOpenAI pointed at Azure's v1 base endpoint
  const llm = new ChatOpenAI({
    modelName: modelName,
    apiKey: apiKey,
    configuration: {
      baseURL: endpoint,
      defaultHeaders: {
        "api-key": apiKey, // Ensures headers match Azure authentication requirements
      },
    },
    temperature: 0.3,
  });

  console.log("🚀 Sending test prompt to Azure OpenAI...");

  try {
    const response = await llm.invoke([
      new HumanMessage("Hello! Please give a one-sentence confirmation that you are online and ready to assist with SOC analysis."),
    ]);

    console.log("\n✅ Success! Response received:");
    console.log("----------------------------------------");
    console.log(response.content);
    console.log("----------------------------------------");
  } catch (error: any) {
    console.error("\n❌ Error connecting to Azure OpenAI:");
    if (error.status) {
      console.error(`Status Code: ${error.status}`);
    }
    if (error.error) {
      console.error("API Error Details:", error.error);
    } else {
      console.error(error);
    }
  }
}

testAzureOpenAI();
