import { getIpGeolocationTools } from "./tools/ipgeolocation.js";

async function testIpGeolocation() {
  console.log("🔍 Testing IPGeolocation Tool Suite...");

  const tools = getIpGeolocationTools();
  if (tools.length === 0) {
    console.error("❌ No IPGeolocation tools returned. Check IPGEOLOCATION_API_KEY in .env.");
    process.exit(1);
  }

  console.log(`✅ Loaded ${tools.length} IPGeolocation tool(s): ${tools.map((t) => t.name).join(", ")}`);

  const lookupTool = tools.find((t) => t.name === "ipgeolocation_lookup");
  if (!lookupTool) {
    console.error("❌ ipgeolocation_lookup tool not found.");
    process.exit(1);
  }

  console.log("\n🌐 1. Testing IP Geolocation lookup for IP 1.1.1.1...");
  const ipResult = await lookupTool.invoke({ ip: "1.1.1.1" });
  console.log("Result:", ipResult.slice(0, 300) + "...\n");

  console.log("🌐 2. Testing IP Geolocation lookup for IP 8.8.8.8...");
  const ipResult2 = await lookupTool.invoke({ ip: "8.8.8.8" });
  console.log("Result:", ipResult2.slice(0, 300) + "...\n");

  console.log("✨ IPGeolocation tool tests completed successfully!");
}

testIpGeolocation().catch(console.error);
