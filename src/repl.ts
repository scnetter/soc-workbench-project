import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { loadMcpTools } from "./mcp-adapter.js";
import { getAbuseIpDbTools } from "./tools/abuseipdb.js";
import { getIpGeolocationTools } from "./tools/ipgeolocation.js";

/**
 * Interactive SOC Analyst Workbench REPL powered by LangGraph ReAct Agent, Falcon MCP, AbuseIPDB, and ipgeolocation.io.
 */
async function startRepl() {
  console.log("==================================================");
  console.log(" 🛡️  SOC Analyst Workbench - ReAct Agent REPL");
  console.log(" Type your prompt and press Enter.");
  console.log(" Type /exit or /quit to end session.");
  console.log("==================================================\n");

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const modelName = process.env.AZURE_OPENAI_MODEL_NAME || "gpt-5.1";

  const falconClientId = process.env.FALCON_CLIENT_ID;
  const falconClientSecret = process.env.FALCON_CLIENT_SECRET;
  const falconBaseUrl = process.env.FALCON_BASE_URL || "https://api.crowdstrike.com";
  const modules = process.env.FALCON_MCP_MODULES || "detections,hosts,intel,spotlight,idp,ngsiem";

  if (!apiKey || !rawEndpoint) {
    console.error("❌ Missing required AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT in .env.");
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

  let tools: DynamicStructuredTool[] = [];
  let mcpClient: Client | null = null;

  // Initialize IPGeolocation Tools if API key exists
  const ipGeoTools = getIpGeolocationTools();
  if (ipGeoTools.length > 0) {
    tools.push(...ipGeoTools);
    console.log(`✅ IPGeolocation Connected! Loaded ${ipGeoTools.length} geolocation tools.`);
  } else {
    console.log("ℹ️ No IPGEOLOCATION_API_KEY found in .env.");
  }

  // Initialize AbuseIPDB Threat Intel Tools if API key exists
  const abuseIpDbTools = getAbuseIpDbTools();
  if (abuseIpDbTools.length > 0) {
    tools.push(...abuseIpDbTools);
    console.log(`✅ AbuseIPDB Connected! Loaded ${abuseIpDbTools.length} threat intelligence tools.`);
  } else {
    console.log("ℹ️ No IPABUSEDB_API_KEY found in .env.");
  }

  // Initialize Falcon MCP Server connection if credentials exist
  if (falconClientId && falconClientSecret) {
    try {
      console.log("🔌 Connecting to Falcon MCP server over stdio...");
      const transport = new StdioClientTransport({
        command: "uvx",
        args: ["falcon-mcp", "--transport", "stdio", "--modules", modules],
        env: {
          ...process.env,
          FALCON_CLIENT_ID: falconClientId,
          FALCON_CLIENT_SECRET: falconClientSecret,
          FALCON_BASE_URL: falconBaseUrl,
        },
      });

      mcpClient = new Client(
        { name: "soc-workbench", version: "0.1.0" },
        { capabilities: {} }
      );

      await mcpClient.connect(transport);
      const mcpTools = await loadMcpTools(mcpClient);
      tools.push(...mcpTools);
      console.log(`✅ Falcon MCP Connected! Loaded ${mcpTools.length} security tools.`);
    } catch (err) {
      console.warn("⚠️ Could not connect to Falcon MCP. Continuing with available tools.");
      console.warn(err);
    }
  } else {
    console.log("ℹ️ No Falcon MCP credentials found in .env.");
  }

  // System Prompt / Persona for SOC Analyst ReAct Agent
  const systemPrompt = new SystemMessage(
    "You are an expert Security Operations Center (SOC) Lead Analyst assistant equipped with CrowdStrike Falcon MCP, IPGeolocation, and AbuseIPDB tools.\n" +
    "Your tone is professional, objective, analytical, and concise.\n" +
    "When asked to investigate detections, hosts, IOCs, IP addresses, subnets, domains, or vulnerabilities, use your available tools to fetch live evidence.\n" +
    "Tool Routing & Threat Intelligence Guidelines:\n" +
    "• IP Address Geolocation (`ipgeolocation_lookup`): ALWAYS use `ipgeolocation_lookup` (via ipgeolocation.io) for geolocation type questions for IP addresses (country, city, state, lat/long, ISP, organization, timezone).\n" +
    "• Domain Names & IP Threat Reputation (`abuseipdb_check_ip`): ALWAYS use `abuseipdb_check_ip` (via AbuseIPDB) for domain name queries, domain reputation checks, and IP threat abuse history.\n" +
    "• Subnet Check (`abuseipdb_check_subnet`): Use for CIDR block range investigations.\n" +
    "• Spotlight Vulnerabilities (`falcon_search_vulnerabilities`): Use `host_info.hostname:'<name>'` or `aid:'<id>'` in FQL filters.\n" +
    "• Detections (`falcon_search_detections`): Use `device.hostname:'<name>'` or `hostname:'<name>'`.\n" +
    "• Hosts (`falcon_search_hosts`): Use `hostname:'<name>'`.\n" +
    "Always present findings clearly with severity assessment, evidence tables, and actionable analyst recommendations."
  );

  // Create LangGraph ReAct Agent
  const agent = createReactAgent({
    llm,
    tools,
    prompt: systemPrompt,
  });

  // Conversation history memory array
  let messages: BaseMessage[] = [];

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const userInput = await rl.question("\nSOC-Analyst> ");
      const trimmed = userInput.trim();

      if (trimmed.toLowerCase() === "/exit" || trimmed.toLowerCase() === "/quit") {
        console.log("\n👋 Exiting SOC Analyst Workbench REPL. Session closed.");
        break;
      }

      if (!trimmed) {
        continue;
      }

      messages.push(new HumanMessage(trimmed));

      process.stdout.write("🤔 Agent processing & reasoning...");

      // Execute LangGraph ReAct loop
      const result = await agent.invoke({ messages });

      // Clear thinking indicator
      process.stdout.write("\r\x1b[K");

      // Update message state with the graph's updated message history
      messages = result.messages;

      // Extract and display the last AI response
      const lastMessage = messages[messages.length - 1];
      console.log(`\nAssistant:\n${lastMessage.content}\n`);
    }
  } catch (error) {
    console.error("\n❌ Error during agent execution:", error);
  } finally {
    if (mcpClient) {
      await mcpClient.close().catch(() => {});
    }
    rl.close();
  }
}

startRepl();
