import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import * as fs from "fs/promises";
import * as path from "path";
import { loadMcpTools } from "./mcp-adapter.js";
import { getAbuseIpDbTools } from "./tools/abuseipdb.js";
import { getIpGeolocationTools } from "./tools/ipgeolocation.js";

/**
 * Reads multi-line input until a closing delimiter (e.g. """ or EOF/---).
 */
async function readMultiLine(
  rl: readline.Interface,
  promptPrefix: string = "... ",
  delimiters: string[] = ['"""', "'''", "EOF", "---"]
): Promise<string> {
  const lines: string[] = [];
  while (true) {
    const line = await rl.question(promptPrefix);
    const trimmed = line.trim();

    // Check exact delimiter match
    if (delimiters.some((d) => trimmed.toUpperCase() === d.toUpperCase())) {
      break;
    }

    // Check if line ends with quote delimiter (e.g., closing line of pasted block: '..."""')
    const quoteDelim = delimiters.find((d) => (d === '"""' || d === "'''") && trimmed.endsWith(d));
    if (quoteDelim) {
      const idx = line.lastIndexOf(quoteDelim);
      const beforeClose = line.substring(0, idx);
      if (beforeClose.trim().length > 0) {
        lines.push(beforeClose);
      }
      break;
    }

    lines.push(line);
  }
  return lines.join("\n");
}

/**
 * Resolves @filepath references in the input and replaces them with file contents.
 * Avoids matching email addresses by requiring @ to follow whitespace or start of line.
 */
async function resolveFileReferences(input: string): Promise<string> {
  const fileRegex = /(?:^|\s)@([a-zA-Z0-9_./\\-]+)/g;
  const matches = [...input.matchAll(fileRegex)];

  if (matches.length === 0) return input;

  let resolved = input;
  for (const match of matches) {
    const rawTarget = match[1];
    const resolvedPath = path.isAbsolute(rawTarget)
      ? rawTarget
      : path.resolve(process.cwd(), rawTarget);

    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isFile()) {
        const content = await fs.readFile(resolvedPath, "utf-8");
        const replacement = `\n\n[Attached File: ${rawTarget}]\n\`\`\`\n${content}\n\`\`\`\n`;
        resolved = resolved.replace(`@${rawTarget}`, replacement);
        console.log(`📎 Attached file: ${rawTarget} (${stats.size} bytes)`);
      }
    } catch {
      // Ignored if target is not a valid file path
    }
  }
  return resolved;
}

/**
 * Prints the CLI usage and command reference documentation.
 */
export function printHelp(): void {
  console.log(`
================================================================================
 🛡️  SOC Analyst Workbench (soc-workbench v0.1.0)
 An intelligent SOC assistant powered by LangGraph, Azure OpenAI & Falcon MCP
================================================================================

USAGE:
  bun start [OPTIONS]
  bun run repl [OPTIONS]
  bun run src/repl.ts [OPTIONS]

CLI OPTIONS:
  -h, --help            Show this command reference and exit
  -v, --version         Show application version and exit

INTERACTIVE REPL COMMANDS:
  /help, help, ?        Display this interactive command reference
  """ ... """           Multi-line block (paste or type text between triple quotes)
  /paste [instruction]  Enter paste mode. Paste content, then type 'EOF' or '---' on a new line
  @<filepath>           Inline file reference (e.g. 'Analyze headers: @samples/phish.eml')
  /file <path> [prompt] Load a file directly into the agent prompt
  /clear, /reset        Clear the conversation memory and start a fresh session
  /exit, /quit          Exit the interactive session

EXAMPLES:
  # 1. Quick Question:
  SOC-Analyst> What are the common indicators of an SPF alignment failure?

  # 2. Multi-line Email Header Analysis:
  SOC-Analyst> """
  ... Analyze this email header for spoofed senders and hops:
  ... Delivered-To: victim@company.com
  ... Received: from mail.attacker.net (198.51.100.25)
  ... Authentication-Results: spf=fail (sender IP is 198.51.100.25)
  ... Subject: Urgent Wire Transfer Notice
  ... """

  # 3. Dedicated Paste Mode:
  SOC-Analyst> /paste Extract all IOCs and domain names:
  📋 [Paste Mode] Paste your text below. Type 'EOF' or '---' on a new line when finished:
  > ...
  > EOF

  # 4. Referencing File on Disk:
  SOC-Analyst> Analyze SPF/DKIM and embedded URLs: @samples/phishing_email.eml

  # 5. CrowdStrike Falcon MCP Queries (when credentials configured):
  SOC-Analyst> Search for detections on host 'WORKSTATION-01' over the last 24 hours.
  SOC-Analyst> Find high severity vulnerabilities on aid '0a1b2c3d4e5f'.

ENVIRONMENT VARIABLES (.env):
  AZURE_OPENAI_API_KEY      (Required) Azure OpenAI API key
  AZURE_OPENAI_ENDPOINT     (Required) Azure OpenAI base endpoint URL
  AZURE_OPENAI_MODEL_NAME   (Optional) Deployment name (default: gpt-5.1)
  FALCON_CLIENT_ID          (Optional) CrowdStrike Falcon API client ID
  FALCON_CLIENT_SECRET      (Optional) CrowdStrike Falcon API client secret
  FALCON_BASE_URL           (Optional) Falcon API base URL (default: https://api.crowdstrike.com)
  FALCON_MCP_MODULES        (Optional) Falcon modules (default: detections,hosts,intel,spotlight,idp,ngsiem)
`);
}

/**
 * Prints the application version.
 */
export function printVersion(): void {
  console.log("soc-workbench v0.1.0");
}

/**
 * Interactive SOC Analyst Workbench REPL powered by LangGraph ReAct Agent, Falcon MCP, AbuseIPDB, and ipgeolocation.io.
 */
async function startRepl() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  if (args.includes("--version") || args.includes("-v")) {
    printVersion();
    return;
  }

  console.log("==================================================");
  console.log(" 🛡️  SOC Analyst Workbench - ReAct Agent REPL");
  console.log(" • Type your prompt and press Enter.");
  console.log(" • Multi-line: Use \"\"\" ... \"\"\" or /paste (end with 'EOF' or '---').");
  console.log(" • File reference: Include @path/to/file or use /file <path> [prompt].");
  console.log(" • Commands: /help, /clear, /exit, /quit");
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
      let trimmed = userInput.trim();

      if (!trimmed) {
        continue;
      }

      if (trimmed.toLowerCase() === "/exit" || trimmed.toLowerCase() === "/quit") {
        console.log("\n👋 Exiting SOC Analyst Workbench REPL. Session closed.");
        break;
      }

      if (
        trimmed.toLowerCase() === "/help" ||
        trimmed.toLowerCase() === "help" ||
        trimmed === "?" ||
        trimmed === "--help" ||
        trimmed === "-h"
      ) {
        printHelp();
        continue;
      }

      if (trimmed.toLowerCase() === "/clear" || trimmed.toLowerCase() === "/reset") {
        messages = [];
        console.log("\n🧹 Conversation history cleared.");
        continue;
      }

      // Handle /file command
      if (trimmed.toLowerCase().startsWith("/file ")) {
        const parts = trimmed.slice(6).trim().split(/\s+/);
        const targetPath = parts[0];
        const extraPrompt = parts.slice(1).join(" ");
        const resolvedPath = path.isAbsolute(targetPath)
          ? targetPath
          : path.resolve(process.cwd(), targetPath);

        try {
          const content = await fs.readFile(resolvedPath, "utf-8");
          const stats = await fs.stat(resolvedPath);
          console.log(`📎 Loaded file: ${targetPath} (${stats.size} bytes)`);
          const promptHeader = extraPrompt ? `${extraPrompt}\n\n` : "Please analyze the following file contents:\n\n";
          trimmed = `${promptHeader}[File: ${targetPath}]\n\`\`\`\n${content}\n\`\`\``;
        } catch (err: any) {
          console.error(`❌ Could not read file '${targetPath}': ${err.message}`);
          continue;
        }
      }
      // Handle /paste command
      else if (trimmed.toLowerCase().startsWith("/paste")) {
        const userPrompt = trimmed.slice(6).trim();
        console.log("📋 [Paste Mode] Paste your text below. Type 'EOF' or '---' on a new line when finished:");
        const pasted = await readMultiLine(rl, "> ", ["EOF", "---", '"""', "'''"]);
        const cleanedPaste = pasted.trim();
        if (!cleanedPaste) {
          console.log("⚠️ No input provided. Cancelled paste mode.");
          continue;
        }
        trimmed = userPrompt ? `${userPrompt}\n\n${cleanedPaste}` : cleanedPaste;
      }
      // Handle triple quotes (""" or ''')
      else if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        const delim = trimmed.startsWith('"""') ? '"""' : "'''";
        const afterOpen = trimmed.slice(3);
        if (afterOpen.endsWith(delim) && afterOpen.length >= 0) {
          // Opened and closed on the same initial line
          trimmed = afterOpen.slice(0, -3).trim();
        } else {
          console.log(`... Multi-line mode active. Paste/type content, end with ${delim}:`);
          const rest = await readMultiLine(rl, "... ", [delim]);
          const combined = (afterOpen ? afterOpen + "\n" : "") + rest;
          trimmed = combined.trim();
        }
        if (!trimmed) {
          continue;
        }
      }

      // Resolve any inline @file references (e.g. "Review @headers.txt")
      trimmed = await resolveFileReferences(trimmed);

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

export { startRepl };

// Run when executed directly
if (import.meta.main || process.argv[1]?.includes("repl")) {
  startRepl();
}
