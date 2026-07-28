import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Converts tools discovered from an MCP Client into LangChain-compatible DynamicStructuredTools.
 * Includes parameter schemas and descriptions from MCP inputSchema to give the LLM exact FQL & API parameter guidance.
 */
export async function loadMcpTools(mcpClient: Client): Promise<DynamicStructuredTool[]> {
  const listResult = await mcpClient.listTools();

  return listResult.tools.map((mcpTool) => {
    let fullDescription = mcpTool.description || `MCP Tool: ${mcpTool.name}`;

    // Append parameter documentation from MCP inputSchema so the LLM sees exact parameter expectations & FQL guidance
    if (mcpTool.inputSchema && mcpTool.inputSchema.properties) {
      const paramDocs = Object.entries(mcpTool.inputSchema.properties)
        .map(([paramName, prop]: [string, any]) => {
          const desc = prop.description ? `: ${prop.description}` : "";
          return `  • ${paramName} (${prop.type || "string"})${desc}`;
        })
        .join("\n");

      if (paramDocs) {
        fullDescription += `\n\nParameters:\n${paramDocs}`;
      }
    }

    return new DynamicStructuredTool({
      name: mcpTool.name,
      description: fullDescription,
      schema: z.object({}).passthrough(),
      func: async (args: Record<string, any>) => {
        try {
          const callResult = await mcpClient.callTool({
            name: mcpTool.name,
            arguments: args,
          });

          // Extract text content from MCP response format
          if (Array.isArray(callResult.content)) {
            return callResult.content
              .map((item: any) => (item.type === "text" ? item.text : JSON.stringify(item)))
              .join("\n");
          }
          return JSON.stringify(callResult);
        } catch (error: any) {
          return `Error executing MCP tool '${mcpTool.name}': ${error.message || String(error)}`;
        }
      },
    });
  });
}
