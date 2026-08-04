# SOC Workbench Architecture Guide: Managing Query Examples & Playbooks

**Author:** SOC Workbench Team  
**Purpose:** Decision guide and implementation blueprint for managing complex tool query examples (e.g. CrowdStrike FQL, Jira, Zscaler) while keeping token usage low and enabling non-programmer analysts to update playbooks easily.

---

## 💡 Executive Summary for Non-Programmer Maintenance

If your primary goal is allowing **non-programmer SOC analysts** to add, edit, and refine query examples as they discover edge cases, **Option 1 (Markdown Playbooks + Reference Tool)** is the hands-down winner.

### Why Markdown Playbooks Win for Team Autonomy:
* **Plain Text**: Analysts write standard Markdown without needing TypeScript, JSON schemas, or code compilation.
* **Git-Friendly**: Team members can submit Pull Requests or edit `.md` files directly in Git.
* **Token Efficient**: The LLM only reads a playbook when it actually needs to perform that specific type of investigation.

---

## 🔍 Detailed Comparison of the 3 Options

### Option 1: Markdown Playbooks + Reference Tool (Recommended First Step)

#### Best Use Cases:
* Team-driven SOC playbooks (Email Header Analysis, Host Deep Dives, Falcon FQL tricks).
* Non-programmers maintaining query templates and domain knowledge.
* Keeping System Prompts concise while allowing endless documentation growth.

#### How It Works:
1. Playbooks are stored as Markdown files in `playbooks/`.
2. A lightweight helper tool `read_playbook_guide({ playbookName })` is registered with the LLM agent.
3. When the user asks a specialized query (e.g., *"Check host vulnerabilities"*), the agent calls `read_playbook_guide("falcon-fql")` to fetch verified query examples *before* running the MCP tool.

#### Implementation Blueprint (TypeScript):

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

export const readPlaybookTool = new DynamicStructuredTool({
  name: "read_playbook_guide",
  description: "Reads a reference playbook or query syntax guide from the playbooks directory. Available playbooks: falcon-fql, email-header-analysis, host-investigation.",
  schema: z.object({
    playbookName: z.string().describe("The name of the playbook file (without extension), e.g. 'falcon-fql'")
  }),
  func: async ({ playbookName }) => {
    try {
      const filePath = path.join(process.cwd(), "playbooks", `${playbookName}.md`);
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    } catch (error) {
      return `Playbook '${playbookName}' not found. Available playbooks are in the /playbooks directory.`;
    }
  }
});
```

---

### Option 2: LangGraph Specialized Subgraphs / Nodes

#### Best Use Cases:
* Multi-step workflows requiring strict state control or branching (e.g. Detection Triage -> Evidence Gathering -> Analyst Review -> Case Closure).
* Enforcing Human-in-the-Loop approval before running high-risk actions (quarantine, RTR commands).

#### How It Works:
Instead of one giant ReAct loop, LangGraph routes the user's intent to dedicated nodes. Each node has its own focused System Message and subset of tools.

```text
               ┌──────────────────────┐
               │    Supervisor Node   │
               └──────────┬───────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
┌─────────────────┐               ┌──────────────────┐
│  Falcon Node    │               │    Jira Node     │
│ (Falcon prompt &│               │ (Jira prompt &   │
│  Falcon tools)  │               │   Jira tools)    │
└─────────────────┘               └──────────────────┘
```

#### Implementation Blueprint (TypeScript / LangGraph):

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";

// Define workflow state
const AgentState = Annotation.Root({
  messages: Annotation<any[]>(),
  currentStage: Annotation<string>(),
});

// Build graph with specialized nodes
const workflow = new StateGraph(AgentState)
  .addNode("triage", async (state) => { /* Focused Triage Prompt */ })
  .addNode("vulnerability_specialist", async (state) => { /* Spotlight FQL Prompt */ })
  .addEdge("__start__", "triage");
```

---

### Option 3: Dynamic Few-Shot Retrieval (RAG for Query Examples)

#### Best Use Cases:
* Large enterprise deployments with 100+ query templates across 10+ MCP servers.
* Automatically selecting the top 2-3 most relevant query examples without requiring the LLM to explicitly call a reference tool first.

#### How It Works:
Before the LLM processes the user prompt, a quick keyword or vector search finds the most relevant query examples from a JSON catalog (`config/query-examples.json`) and appends them to the current prompt turn.

#### Implementation Blueprint (TypeScript):

```typescript
// config/query-examples.json
[
  {
    "keywords": ["vulnerability", "spotlight", "cve"],
    "tool": "falcon_search_vulnerabilities",
    "example_fql": "host_info.hostname:'<name>' + status:'open'"
  }
]
```

---

## 📊 Summary Comparison Matrix

| Feature | Option 1: Markdown Playbooks | Option 2: LangGraph Subgraphs | Option 3: Few-Shot RAG |
| :--- | :--- | :--- | :--- |
| **Non-Programmer Maintenance** | ⭐⭐⭐⭐⭐ (Pure Markdown) | ⭐⭐ (Requires Code Editing) | ⭐⭐⭐ (Requires JSON Editing) |
| **Token Efficiency** | ⭐⭐⭐⭐ (On-Demand Loading) | ⭐⭐⭐⭐⭐ (Isolated Node Prompts) | ⭐⭐⭐⭐⭐ (Retrieves 1-2 Examples) |
| **Implementation Complexity** | ⭐ (Low - 15 lines of code) | ⭐⭐⭐ (Medium - State Graph) | ⭐⭐⭐ (Medium - Retrieval Search) |
| **Best For** | Team Playbooks & FQL Guides | Multi-Stage Workflow Controls | Large-scale query repositories |

---

## 🛤️ Recommended Implementation Roadmap

1. **Phase 1 (Immediate)**: Implement **Option 1 (Markdown Playbooks)**.
   * Create a `/playbooks` directory.
   * Add `playbooks/falcon-fql.md` with CrowdStrike FQL rules.
   * Add `read_playbook_guide` tool to the agent.
2. **Phase 2 (Future Workflows)**: Add **Option 2 (LangGraph Subgraphs)** when building multi-stage playbooks (like Email Analysis or Host Isolation with Human-in-the-Loop).
