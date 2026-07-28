import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Test script to verify stdio connectivity with official CrowdStrike Falcon MCP server (via uvx).
 */
async function testFalconMcp() {
  console.log("🔍 Checking Falcon MCP configuration...");

  const falconClientId = process.env.FALCON_CLIENT_ID;
  const falconClientSecret = process.env.FALCON_CLIENT_SECRET;
  const falconBaseUrl = process.env.FALCON_BASE_URL || "https://api.crowdstrike.com";
  const modules = process.env.FALCON_MCP_MODULES || "detections,hosts,intel,spotlight,idp,ngsiem";

  if (!falconClientId || !falconClientSecret) {
    console.error("❌ Missing FALCON_CLIENT_ID or FALCON_CLIENT_SECRET in .env file.");
    console.log("💡 Add your CrowdStrike API client credentials to .env (see .env.example).");
    return;
  }

  console.log(`📡 Base URL: ${falconBaseUrl}`);
  console.log(`📦 Enabled Modules: ${modules}`);
  console.log("🚀 Spawning Falcon MCP stdio process (uvx falcon-mcp)...");

  // Create stdio transport spawning 'uvx falcon-mcp' as a child process
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

  // Create MCP Client
  const client = new Client(
    { name: "soc-workbench", version: "0.1.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("✅ Successfully connected to Falcon MCP Server over stdio!");

    console.log("\n📋 Discovering tools exposed by Falcon MCP...");
    const result = await client.listTools();

    console.log(`\n🎉 Received ${result.tools.length} tools:`);
    console.log("--------------------------------------------------");
    for (const tool of result.tools) {
      console.log(`• [${tool.name}] - ${tool.description ? tool.description.split("\n")[0] : "No description"}`);
    }
    console.log("--------------------------------------------------");

    await client.close();
    console.log("\n👋 Connection closed cleanly.");
  } catch (error) {
    console.error("\n❌ Error connecting to Falcon MCP Server:");
    console.error(error);
  }
}

testFalconMcp();
