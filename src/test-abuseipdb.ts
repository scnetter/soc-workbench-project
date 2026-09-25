import { getAbuseIpDbTools } from "./tools/abuseipdb.js";

async function testAbuseIpDb() {
  console.log("🔍 Testing AbuseIPDB Tool Suite...");

  const tools = getAbuseIpDbTools();
  if (tools.length === 0) {
    console.error("❌ No AbuseIPDB tools returned. Check IPABUSEDB_API_KEY in .env.");
    process.exit(1);
  }

  console.log(`✅ Loaded ${tools.length} AbuseIPDB tool(s): ${tools.map((t) => t.name).join(", ")}`);

  const checkIpTool = tools.find((t) => t.name === "abuseipdb_check_ip");
  if (!checkIpTool) {
    console.error("❌ abuseipdb_check_ip tool not found.");
    process.exit(1);
  }

  console.log("\n🌐 1. Testing IP lookup (1.1.1.1)...");
  const ipResult = await checkIpTool.invoke({ ipOrDomain: "1.1.1.1", verbose: false });
  console.log("Result:", ipResult.slice(0, 300) + "...\n");

  console.log("🌐 2. Testing Domain resolution & lookup (cloudflare.com)...");
  const domainResult = await checkIpTool.invoke({ ipOrDomain: "cloudflare.com", verbose: false });
  console.log("Result:", domainResult.slice(0, 300) + "...\n");

  console.log("✨ AbuseIPDB tool tests completed successfully!");
}

testAbuseIpDb().catch(console.error);
