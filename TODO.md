# SOC Analyst Workbench - Project Ideas & TODO Roadmap

This document serves as a backlog for ideas, future MCP server integrations, playbooks, and architectural enhancements.

---

## 🚀 Future MCP Server Integrations

### 1. Jira MCP Server
- [ ] **Interrogate Tickets**: Query Jira for open incidents related to a specific host, user, or IP address.
- [ ] **Ticket Creation**: Automatically generate structured incident tickets from investigation summaries.
- [ ] **Ticket Updates**: Append evidence JSON, IOC tables, and analyst recommendations to existing tickets.

### 2. Zscaler MCP Server
- [ ] **Zscaler Internet Access (ZIA)**: Search web logs by IP/URL to check if a host accessed suspicious domains.
- [ ] **URL Categorization**: Query Zscaler reputation and categorization for URLs extracted from alerts or emails.
- [ ] **User Activity**: Audit user web access logs during incident timeline windows.

### 3. Additional Threat Intel MCPs & Tools
- [ ] **AbuseIPDB**: Look up IP abuse confidence scores and report history.
- [ ] **VirusTotal**: Retrieve domain/file hash reputation and detection ratios.
- [ ] **GreyNoise**: Check if an IP is a known benign internet scanner vs. targeted adversary.
- [ ] **URLScan**: Fetch website screenshots and DOM analysis for suspicious links.

---

## 📋 Investigation Playbooks

- [ ] **Email Header Analysis Playbook**:
  - Parse received headers, SPF/DKIM/DMARC alignment.
  - Reconstruct mail path timeline.
  - Extract & enrich embedded IOCs.
- [ ] **Host Deep-Dive Playbook**:
  - Correlate Falcon detections + Spotlight vulnerabilities + Jira ticket history for a single workstation.

---

## ⚙️ Core Platform & LangGraph Enhancements

- [ ] **Human-in-the-Loop (HITL) Review Points**:
  - Use LangGraph `interrupt()` to require explicit analyst approval before performing high-impact actions (e.g., host isolation or RTR commands).
- [ ] **Reporting Engine**:
  - Export case artifacts to `cases/case-id/` directory (`summary.md`, `timeline.md`, `evidence.json`, `iocs.csv`).
- [ ] **LangGraph Checkpointing / Persistence**:
  - Add SQLite memory saver (`MemorySaver` / `SqliteSaver`) so conversation and investigation state persist across REPL restarts.

---

## 📝 Notes & Sandbox Ideas

- *Add your temporary notes or quick ideas here...*
