# CrowdStrike Falcon Query Language (FQL) Guide

Use this reference guide when constructing FQL filter parameters for CrowdStrike Falcon MCP tools.

---

## 1. Spotlight Vulnerabilities (`falcon_search_vulnerabilities`)

### Allowed FQL Filter Properties:
* `host_info.hostname`: Computer hostname (e.g. `host_info.hostname:'WORKSTATION-01'`)
* `aid`: CrowdStrike Agent ID (e.g. `aid:'a1b2c3d4...'`)
* `status`: Vulnerability status (`'open'`, `'closed'`, `'remediated'`, `'suppressed'`)
* `cve.id`: Specific CVE ID (e.g. `cve.id:'CVE-2023-23397'`)
* `cve.exprt_rating`: EXPRT risk rating (`'HIGH'`, `'CRITICAL'`)

### ❌ DO NOT USE (API Error):
* `device.hostname` (Invalid in Spotlight API)
* `device.device_id` (Invalid in Spotlight API)

### Verified Examples:
```text
host_info.hostname:'M-Q7R4JMX7QL' + status:'open'
host_info.hostname:'M-Q7R4JMX7QL' + cve.exprt_rating:['HIGH','CRITICAL']
```

---

## 2. Detections (`falcon_search_detections`)

### Allowed FQL Filter Properties:
* `device.hostname`: Computer hostname (e.g. `device.hostname:'WORKSTATION-01'`)
* `hostname`: Computer hostname (e.g. `hostname:'WORKSTATION-01'`)
* `max_severity_displayname`: Severity name (`'Critical'`, `'High'`, `'Medium'`, `'Low'`)
* `status`: Detection status (`'new'`, `'in_progress'`, `'closed'`)

### Verified Examples:
```text
device.hostname:'M-Q7R4JMX7QL' + status:'new'
max_severity_displayname:'Critical'
```

---

## 3. Host Search (`falcon_search_hosts`)

### Allowed FQL Filter Properties:
* `hostname`: Computer hostname wildcard support (e.g. `hostname:'WORKSTATION-01*'`)
* `platform_name`: OS platform (`'Windows'`, `'Mac'`, `'Linux'`)
* `status`: Host status (`'normal'`, `'contained'`)

### Verified Examples:
```text
hostname:'M-Q7R4JMX7QL*'
platform_name:'Windows' + status:'normal'
```
