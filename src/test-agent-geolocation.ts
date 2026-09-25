import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getAbuseIpDbTools } from "./tools/abuseipdb.js";
import { getIpGeolocationTools } from "./tools/ipgeolocation.js";

async function testAgentGeolocationRouting() {
  console.log("🤖 Testing ReAct Agent tool routing (IP Geolocation vs Domain AbuseIPDB)...\n");

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

  const tools = [...getIpGeolocationTools(), ...getAbuseIpDbTools()];
  console.log(`✅ Loaded ${tools.length} tool(s) for the agent: ${tools.map((t) => t.name).join(", ")}`);

  const systemPrompt = new SystemMessage(
    "You are an expert Security Operations Center (SOC) Lead Analyst assistant equipped with IPGeolocation and AbuseIPDB tools.\n" +
    "Tool Routing Guidelines:\n" +
    "• IP Address Geolocation (`ipgeolocation_lookup`): ALWAYS use `ipgeolocation_lookup` for geolocation type questions for IP addresses (country, city, state, lat/long, ISP, organization, timezone).\n" +
    "• Domain Names & IP Threat Reputation (`abuseipdb_check_ip`): ALWAYS use `abuseipdb_check_ip` for domain name queries and domain reputation checks."
  );

  const agent = createReactAgent({
    llm,
    tools,
    prompt: systemPrompt,
  });

  // Query 1: IP Geolocation query -> Should use ipgeolocation_lookup
  const query1 = "What is the geolocation of IP address 8.8.8.8?";
  console.log(`\n💬 Query 1: "${query1}"`);
  const res1 = await agent.invoke({ messages: [new HumanMessage(query1)] });
  const toolCalls1 = res1.messages.filter((m: any) => m.tool_calls && m.tool_calls.length > 0);
  console.log("Tool called for IP Geolocation:", toolCalls1.map((m: any) => m.tool_calls.map((tc: any) => tc.name)).flat());

  // Query 2: Domain Reputation query -> Should use abuseipdb_check_ip
  const query2 = "What is the reputation of domain name cloudflare.com?";
  console.log(`\n💬 Query 2: "${query2}"`);
  const res2 = await agent.invoke({ messages: [new HumanMessage(query2)] });
  const toolCalls2 = res2.messages.filter((m: any) => m.tool_calls && m.tool_calls.length > 0);
  console.log("Tool called for Domain Name:", toolCalls2.map((m: any) => m.tool_calls.map((tc: any) => tc.name)).flat());

  console.log("\n✨ Agent tool routing test completed!");
}

testAgentGeolocationRouting().catch(console.error);
