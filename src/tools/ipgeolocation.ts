import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as dns from "dns/promises";
import * as net from "net";

/**
 * Creates and returns ipgeolocation.io tool for IP geolocation lookups if API key is present in environment.
 */
export function getIpGeolocationTools(): DynamicStructuredTool[] {
  const apiKey = process.env.IPGEOLOCATION_API_KEY;
  if (!apiKey) {
    return [];
  }

  const lookupTool = new DynamicStructuredTool({
    name: "ipgeolocation_lookup",
    description:
      "Lookup geolocation, country, city, state/province, latitude/longitude, ISP, organization, and timezone details for an IP address using ipgeolocation.io.\n" +
      "Use this tool for IP address geolocation queries.",
    schema: z.object({
      ip: z
        .string()
        .describe("The IP address (IPv4 or IPv6) or domain name to query for geolocation."),
    }),
    func: async ({ ip }) => {
      try {
        let targetIp = ip.trim();
        let domainResolved: string | null = null;

        // If input is not a valid IP address, attempt DNS resolution
        if (net.isIP(targetIp) === 0) {
          try {
            const lookup = await dns.lookup(targetIp);
            domainResolved = targetIp;
            targetIp = lookup.address;
          } catch (dnsErr: any) {
            return `Error resolving domain '${ip}': ${dnsErr.message || String(dnsErr)}`;
          }
        }

        const url = new URL("https://api.ipgeolocation.io/ipgeo");
        url.searchParams.append("apiKey", apiKey);
        url.searchParams.append("ip", targetIp);

        const response = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errText = await response.text();
          return `ipgeolocation.io API error (HTTP ${response.status}): ${errText}`;
        }

        const result = await response.json();

        if (domainResolved && result && typeof result === "object") {
          result.resolvedDomain = domainResolved;
        }

        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return `Error calling ipgeolocation.io API: ${error.message || String(error)}`;
      }
    },
  });

  return [lookupTool];
}
