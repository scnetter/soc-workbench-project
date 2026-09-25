import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as dns from "dns/promises";
import * as net from "net";

/**
 * Creates and returns AbuseIPDB tools for IP and domain reputation checks if API key is present in environment.
 */
export function getAbuseIpDbTools(): DynamicStructuredTool[] {
  const apiKey = process.env.IPABUSEDB_API_KEY || process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    return [];
  }

  const checkIpTool = new DynamicStructuredTool({
    name: "abuseipdb_check_ip",
    description:
      "Check threat reputation, abuse confidence score, ISP, domain, hostnames, and report history for a domain name or IP address using AbuseIPDB.\n" +
      "Recommended for domain name lookups and IP threat reputation checks. Accepts domain names (resolves to IP first), IPv4, or IPv6.",
    schema: z.object({
      ipOrDomain: z
        .string()
        .describe("The IP address (IPv4/IPv6) or domain name to check against AbuseIPDB."),
      maxAgeInDays: z
        .number()
        .optional()
        .default(30)
        .describe("Number of days back to retrieve report history (1-365). Default is 30."),
      verbose: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, returns detailed report history and comments. Default is true."),
    }),
    func: async ({ ipOrDomain, maxAgeInDays = 30, verbose = true }) => {
      try {
        let targetIp = ipOrDomain.trim();
        let domainResolved: string | null = null;

        // If input is not a valid IP address, attempt DNS resolution
        if (net.isIP(targetIp) === 0) {
          try {
            const lookup = await dns.lookup(targetIp);
            domainResolved = targetIp;
            targetIp = lookup.address;
          } catch (dnsErr: any) {
            return `Error resolving domain '${ipOrDomain}': ${dnsErr.message || String(dnsErr)}`;
          }
        }

        const url = new URL("https://api.abuseipdb.com/api/v2/check");
        url.searchParams.append("ipAddress", targetIp);
        url.searchParams.append("maxAgeInDays", maxAgeInDays.toString());
        if (verbose) {
          url.searchParams.append("verbose", "true");
        }

        const response = await fetch(url.toString(), {
          headers: {
            Key: apiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errText = await response.text();
          return `AbuseIPDB API error (HTTP ${response.status}): ${errText}`;
        }

        const result = await response.json();

        if (domainResolved && result && typeof result === "object") {
          result.resolvedDomain = domainResolved;
        }

        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return `Error calling AbuseIPDB API: ${error.message || String(error)}`;
      }
    },
  });

  const checkSubnetTool = new DynamicStructuredTool({
    name: "abuseipdb_check_subnet",
    description:
      "Check a CIDR network subnet block (e.g. 192.168.1.0/24) for reported abusive IP addresses using AbuseIPDB.",
    schema: z.object({
      network: z
        .string()
        .describe("The CIDR network block (e.g. 192.168.1.0/24 or 2001:db8::/32)."),
      maxAgeInDays: z
        .number()
        .optional()
        .default(30)
        .describe("Number of days back to check reports (1-365). Default is 30."),
    }),
    func: async ({ network, maxAgeInDays = 30 }) => {
      try {
        const url = new URL("https://api.abuseipdb.com/api/v2/check-block");
        url.searchParams.append("network", network.trim());
        url.searchParams.append("maxAgeInDays", maxAgeInDays.toString());

        const response = await fetch(url.toString(), {
          headers: {
            Key: apiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errText = await response.text();
          return `AbuseIPDB API error (HTTP ${response.status}): ${errText}`;
        }

        const result = await response.json();
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        return `Error calling AbuseIPDB API: ${error.message || String(error)}`;
      }
    },
  });

  return [checkIpTool, checkSubnetTool];
}
