# SOC Workbench Project Plan
## LangGraph / LangChain-Based SOC Analyst Workbench

**Author:** Kelly Netterville  
**Version:** 0.1 Draft  
**Date:** July 2026

---

# Executive Summary

The goal of this project is to create a portable, locally deployable SOC analyst workbench that combines:

- Azure OpenAI GPT-5.1
- LangGraph / LangChain
- MCP (Model Context Protocol) tools
- CrowdStrike Falcon MCP
- Third-party threat intelligence enrichment services
- Standardized investigation playbooks
- Shared workflows and prompt templates

The intent is to build and test workflows locally first, then distribute them to other SOC engineers through a controlled Git-based deployment model.

This approach provides:

- Faster development cycles than Copilot Studio
- Easy integration of MCP servers
- Local execution and experimentation
- Shared team standards
- Reproducible deployments
- Future integration path into Copilot Studio or Microsoft Agent Framework

---

# Vision

Create a SOC analyst assistant capable of:

- Analyzing detections
- Investigating hosts
- Reviewing vulnerabilities
- Performing IOC enrichment
- Analyzing email headers
- Creating investigation summaries
- Generating analyst-ready reports

The long-term goal is to have all analysts running the same toolset while allowing centralized updates through source control.

---

# Design Principles

## 1. Local First

The platform should:

- Run on analyst workstations
- Support local MCP servers
- Avoid unnecessary cloud infrastructure
- Support offline development and testing

## 2. Shared Tooling

All analysts should use:

- Same prompts
- Same workflows
- Same MCP configurations
- Same reporting format

## 3. Human-in-the-Loop

The system should:

- Recommend actions
- Explain rationale
- Present evidence

The AI should not automatically:

- Quarantine hosts
- Run RTR commands
- Create exclusions
- Modify policies

Without analyst approval.

## 4. Modular

New tools should be easy to add:

```text
CrowdStrike
Sentinel
Jira
AbuseIPDB
VirusTotal
GreyNoise
MISP
Hybrid Analysis
URLScan
```

---

# Technical Architecture

```text
SOC Workbench
│
├── LangGraph Runtime
│
├── Azure OpenAI GPT-5.1
│
├── MCP Layer
│   ├── Falcon MCP
│   ├── Filesystem MCP
│   ├── Future MCPs
│
├── Tools Layer
│   ├── AbuseIPDB API
│   ├── VirusTotal API
│   ├── GreyNoise API
│   ├── URLScan API
│
├── Playbooks
│   ├── Detection Triage
│   ├── Host Investigation
│   ├── Email Header Analysis
│
└── Report Generation
    ├── Markdown
    ├── JSON Evidence
    └── Case Summaries
```

---

# Phase 1 – MVP

## Objective

Build a useful SOC investigation assistant using Falcon MCP.

No email analysis yet.

Keep the scope small.

---

## Capabilities

### Detection Investigation

Prompt:

```text
Investigate Falcon detection ldt:xxxxx
```

Workflow:

1. Retrieve detection
2. Retrieve host details
3. Retrieve related detections
4. Retrieve user information
5. Summarize findings

---

### Host Investigation

Prompt:

```text
Investigate host ABC123
```

Workflow:

1. Retrieve host details
2. Host risk indicators
3. Recent detections
4. Vulnerabilities
5. Summary

---

### IOC Lookup

Prompt:

```text
Investigate IP 1.2.3.4
```

Workflow:

1. Falcon Intel
2. Falcon detections
3. Falcon host activity
4. Generate confidence assessment

---

## Falcon MCP Modules

Enable:

```text
detections
hosts
intel
spotlight
idp
ngsiem
```

Avoid initially:

```text
quarantine
rtr
policies
firewall
ioc write actions
exclusions
```

---

# Phase 2 – Email Header Analysis

## Objective

Implement a repeatable email investigation workflow.

This becomes the first major analyst playbook.

---

# Email Investigation Design

A dedicated Markdown file will drive agent behavior.

Example:

```text
playbooks/email-header-analysis.md
```

---

## Analyst Workflow

Input:

```text
Analyze this email header.
```

Steps:

### Step 1

Parse:

- Received headers
- Message-ID
- Return-Path
- Sender
- SPF
- DKIM
- DMARC

---

### Step 2

Build Mail Path Timeline

Identify:

- Origination IP
- Relay sequence
- Receiving servers

---

### Step 3

IOC Extraction

Extract:

- IPv4
- IPv6
- Domains
- URLs
- Email Addresses

---

### Step 4

IOC Enrichment

Use:

#### AbuseIPDB

Retrieve:

- Abuse confidence score
- Reports count
- Last report date

#### VirusTotal

Retrieve:

- Detection ratio
- Community score

#### GreyNoise

Retrieve:

- Internet scanning activity

#### URLScan

Retrieve:

- Website reputation

---

### Step 5

Generate Assessment

Categories:

```text
Likely Malicious
Suspicious
Likely Benign
Requires Further Investigation
```

---

# Example Playbook Structure

## File

```text
playbooks/email-header-analysis.md
```

Example:

```markdown
# Email Header Analysis

Objective:
Determine whether an email should be considered malicious,
suspicious, or benign.

## Analysis Steps

1. Extract received headers.
2. Determine origination source.
3. Perform SPF validation.
4. Perform DKIM validation.
5. Check DMARC alignment.
6. Extract all IOCs.
7. Check AbuseIPDB.
8. Check VirusTotal.
9. Check GreyNoise.
10. Generate summary.

## Output Requirements

Provide:

- Executive Summary
- Mail Path
- IOC Table
- Reputation Results
- Assessment
- Analyst Recommendation
```

---

# Phase 3 – External Enrichment Framework

## Goal

Create reusable tool wrappers.

Examples:

```python
abuseipdb_lookup()
virustotal_lookup()
greynoise_lookup()
urlscan_lookup()
```

LangGraph nodes can call these functions.

---

## Benefits

Future workflows automatically gain:

- Reputation data
- Threat intelligence
- IOC context

Without re-implementing logic.

---

# Phase 4 – Reporting Engine

Generate investigation artifacts automatically.

## Output Directory

```text
cases/
└── case-id/
    ├── summary.md
    ├── timeline.md
    ├── evidence.json
    ├── iocs.csv
    └── recommendations.md
```

---

## Sample Summary

```markdown
# Investigation Summary

Detection ID:
ldt:12345

Host:
WORKSTATION-01

User:
jsmith

Risk Level:
Medium

Summary:
PowerShell execution observed downloading content
from a suspicious IP previously reported by
AbuseIPDB.

Recommendation:
Escalate for analyst review.
```

---

# Phase 5 – Team Distribution

## Repository Structure

```text
soc-workbench/
│
├── agent/
├── playbooks/
├── tools/
├── prompts/
├── scripts/
├── config/
└── docs/
```

---

## Installation

```powershell
git clone <repo>
cd soc-workbench

.\scripts\install.ps1
```

---

## Updates

```powershell
.\scripts\update.ps1
```

The update script should:

- Pull latest repository
- Update dependencies
- Refresh MCP configs
- Validate tool access
- Run health checks

---

# Technology Stack

## Agent Runtime

Preferred:

```text
LangGraph
```

Reason:

- Deterministic workflows
- State management
- Human review points
- Better SOC process modeling

---

## LLM

```text
Azure OpenAI GPT-5.1
```

Using:

```text
/openai/v1/
```

endpoint.

---

## Initial MCP

```text
CrowdStrike Falcon MCP
```

Future additions:

```text
Sentinel
Jira
GitHub
Filesystem
M365
Defender
```

---

## Outputs

```text
Markdown
JSON
CSV
```

Human-readable first.

---

# Initial Success Criteria

The MVP is successful when an analyst can:

1. Launch the workbench locally.
2. Connect to Falcon MCP.
3. Investigate a detection.
4. Investigate a host.
5. Generate a Markdown summary.
6. Update the workbench from Git.
7. Share the same workflow with another analyst.

---

# Long-Term Vision

```text
SOC Workbench
      ↓
Shared Team Platform
      ↓
Standardized Playbooks
      ↓
Agent Marketplace
      ↓
Selective Migration to
Copilot Studio / Agent Framework
```

The workbench becomes the SOC innovation platform where analysts develop new playbooks rapidly, validate usefulness, and eventually promote mature capabilities into enterprise-managed agent platforms.
