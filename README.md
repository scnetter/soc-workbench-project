# SOC Analyst Workbench

A portable, locally deployable SOC analyst workbench built with **TypeScript**, **Bun**, **LangGraph.js**, and **Model Context Protocol (MCP)** tools.

---

## 🛠️ Stack & Technologies
- **Runtime & Package Manager**: Bun (TypeScript native)
- **Agent Framework**: `@langchain/langgraph` & `@langchain/openai`
- **LLM**: Azure OpenAI (GPT-5.1)
- **Tool Protocol**: `@modelcontextprotocol/sdk` (CrowdStrike Falcon MCP via `uvx`)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Set your Azure OpenAI and CrowdStrike Falcon credentials:
```ini
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/v1
AZURE_OPENAI_MODEL_NAME=gpt-5.1

FALCON_CLIENT_ID=your_client_id
FALCON_CLIENT_SECRET=your_client_secret
FALCON_BASE_URL=https://api.crowdstrike.com
```

### 3. Run Commands
* **Launch Interactive REPL**: `bun start`
* **Test Azure OpenAI Connection**: `bun run test:llm`
* **Test Falcon MCP Tool Discovery**: `bun run test:mcp`
* **TypeScript Typecheck**: `bun run typecheck`

---

## 📚 Guides & Playbooks

### Analyst Playbooks (`playbooks/`)
Markdown files designed for **non-programmer SOC analysts** to update query templates, FQL syntax rules, and investigation playbooks without modifying code:
* **[playbooks/falcon-fql.md](playbooks/falcon-fql.md)**: Verified FQL query parameters and syntax rules for CrowdStrike Spotlight, Detections, and Host Search endpoints.

### Architecture & Optimization Guides (`docs/`)
Architectural documentation and blueprints for future platform expansion:
* **[docs/query-optimization-guide.md](docs/query-optimization-guide.md)**: Decision framework and implementation guide for managing complex tool queries, progressive disclosure reference tools, and LangGraph subgraphs.

---

## 📌 Project Tracking & Ideas
For future feature ideas, upcoming MCP server integrations (Jira, Zscaler), and playbook roadmaps, see [TODO.md](TODO.md).
