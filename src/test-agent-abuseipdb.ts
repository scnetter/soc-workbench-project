import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getAbuseIpDbTools } from "./tools/abuseipdb.js";

async function testAgentWithAbuseIpDb() {
  console.log("🤖 Testing LangGraph ReAct Agent with AbuseIPDB tool integration...\n");

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const modelName = process.env.AZURE_OPENAI_MODEL_NAME || "gpt-5.1";

  if (!apiKey || !rawEndpoint) {
    console.error("❌ Missing required AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT in .env.");
    return;
  }

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
    temperature: 0.2,
  });

  const tools = getAbuseIpDbTools();
  console.log(`✅ Loaded ${tools.length} tool(s) for the agent.`);

  const systemPrompt = new SystemMessage(
    "You are an expert Security Operations Center (SOC) Lead Analyst assistant.\n" +
    "When asked about an IP address or domain, use `abuseipdb_check_ip` to look up its threat reputation score, ISP, country, usage type, and abuse history."
  );

  const agent = createReactAgent({
    llm,
    tools,
    prompt: systemPrompt,
  });

  const userQuery = "Can you check the reputation of IP address 118.25.6.39 and summarize the findings?";
  console.log(`💬 User Query: "${userQuery}"\n`);

  const result = await agent.invoke({
    messages: [new HumanMessage(userQuery)],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  console.log("--------------------------------------------------");
  console.log("🤖 Agent Final Response:");
  console.log("--------------------------------------------------");
  console.log(lastMessage.content);
}

testAgentWithAbuseIpDb().catch(console.error);
