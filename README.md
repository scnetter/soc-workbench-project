# SOC Analyst Workbench

A portable, locally deployable SOC analyst workbench built with **TypeScript**, **Bun**, **LangGraph.js**, and **Model Context Protocol (MCP)** tools.

---

## 🛠️ Stack & Technologies
- **Runtime & Package Manager**: Bun (TypeScript native)
- **Agent Framework**: `@langchain/langgraph` & `@langchain/openai`
- **LLM**: Azure OpenAI (GPT-5.1)
- **Tool Protocols & APIs**:
  - CrowdStrike Falcon MCP via `uvx`
  - AbuseIPDB Threat Intelligence API (`api.abuseipdb.com`)
  - IPGeolocation.io Location API (`api.ipgeolocation.io`)

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

Set your Azure OpenAI, CrowdStrike Falcon, AbuseIPDB, and IPGeolocation credentials:
```ini
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/v1
AZURE_OPENAI_MODEL_NAME=gpt-5.1

FALCON_CLIENT_ID=your_client_id
FALCON_CLIENT_SECRET=your_client_secret
FALCON_BASE_URL=https://api.crowdstrike.com

IPABUSEDB_API_KEY=your_abuseipdb_api_key
IPGEOLOCATION_API_KEY=your_ipgeolocation_api_key
```

### 3. Run Commands
* **Launch Interactive REPL**: `bun start`
* **Show Help & Command Reference**: `bun start --help` or `bun run help`
* **Show Version**: `bun run repl -v`
* **Test Azure OpenAI Connection**: `bun run test:llm`
* **Test Falcon MCP Tool Discovery**: `bun run test:mcp`
* **Test AbuseIPDB Integration**: `bun run test:abuseipdb`
* **Test IPGeolocation Integration**: `bun run test:ipgeo`
* **Test Agent Geolocation Routing**: `bun run test:agent-geo`
* **TypeScript Typecheck**: `bun run typecheck`

### 4. REPL Commands & Multi-Line Input
The interactive CLI supports multi-line text (such as email headers, log blocks, or scripts), file references, and session commands:
* **Help & Usage**: Type `/help`, `help`, or `?` at any time to view the command reference.
* **Multi-line Blocks (`"""`)**: Start a prompt with `"""`, paste or type multiple lines, and end with `"""`.
* **Paste Mode (`/paste`)**: Enter `/paste [optional instructions]`. Paste raw text, then type `EOF` or `---` on a new line to send.
* **Inline File Attachments (`@file`)**: Type `@path/to/file` in any prompt (e.g. `Analyze headers: @samples/phish.eml`) to automatically expand file contents into the request.
* **File Load Command (`/file`)**: Use `/file <path> [prompt]` to load an entire file directly into the prompt.
* **Session Management**: Use `/clear` or `/reset` to clear conversation memory, and `/exit` or `/quit` to close.

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
