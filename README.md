# Easy Router

Easy Router is a Linux router management application designed to provide a simple web-based control panel for configuring and managing network services.

The browser is intentionally treated as a **control panel**, not as the owner of any router services. Long-running services such as `hostapd`, `dnsmasq`, and eventually WireGuard are managed by Linux/systemd and continue running independently of the web interface.

The long-term goal is to make configuring a Linux router feel less like manually editing configuration files and more like managing a single, coherent router system.

## Project Status

Easy Router is currently in the **early development / architectural phase**.

The current implementation includes:

* FastAPI backend
* Pydantic-based configuration models
* Web-based configuration interface
* Network interface discovery
* Hostapd configuration management
* Dnsmasq configuration management
* Persistent router configuration through `config.json`
* Native configuration generation for system services

The next major stage is moving from configuration management toward **reliable system reconciliation**: making the actual Linux system converge toward the desired state stored by Easy Router.

Some of the service-management and recovery functionality described below is therefore part of the planned architecture rather than fully implemented functionality.

---

## Goals

Easy Router is being designed around a few core principles.

### 1. The browser is only a control panel

The web application should never own the lifetime of router services.

Closing the browser must not stop:

* `hostapd`
* `dnsmasq`
* WireGuard
* DHCP/DNS services
* or any other router service

The browser communicates with the FastAPI backend, while Linux/systemd owns the actual services.

### 2. Configuration is represented as structured data

Instead of making the web application manipulate daemon configuration files directly, Easy Router uses Pydantic models to represent the desired router configuration.

For example:

```text
Browser
   ↓
Pydantic model
   ↓
config.json
   ↓
service renderer
   ↓
native daemon configuration
```

This provides a stable application-level representation of the router configuration while still allowing Easy Router to generate the native configuration formats required by Linux services.

### 3. Easy Router should be able to recover

The system is intended to be resilient to:

* service crashes
* machine reboots
* configuration changes
* accidental manual configuration changes
* failed configuration applications
* invalid generated configuration

The goal is that the system can determine what the router **should** look like and bring the machine back into that state.

### 4. Services remain independent of the web application

Easy Router should not launch long-running daemons with Python processes such as:

```python
subprocess.Popen(["dnsmasq", ...])
```

Instead, systemd should manage those processes.

Easy Router acts as a management layer over them.

---

# Architecture

The project is moving toward a desired-state architecture.

```text
                         Browser
                            │
                            │ HTTP
                            ▼
                    ┌─────────────────┐
                    │     FastAPI     │
                    │   Control API   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ ConfigManager   │
                    │                 │
                    │  config.json   │
                    └────────┬────────┘
                             │
                       Desired State
                             │
                             ▼
                    ┌─────────────────┐
                    │   Reconciler    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        DnsmasqService  HostapdService  WireGuardService
              │              │              │
              ▼              ▼              ▼
       dnsmasq.conf     hostapd.conf    WireGuard config
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                          systemd
                             │
                             ▼
                        Linux system
```

The important distinction is between **desired state** and **actual state**.

## Desired State

The desired state is represented by Easy Router's configuration models and persisted to `config.json`.

For example:

```json
{
    "version": 1,
    "hostapd": {
        "interface": "wlp4s0",
        "ssid": "EasyRouter",
        "country": "NL",
        "channel": 6
    },
    "dnsmasq": {
        "interface": "br0",
        "cache_size": 10000
    }
}
```

This represents what the router is intended to be.

## Actual State

The actual state is the state of the Linux machine:

* generated daemon configuration files
* running systemd services
* network interfaces
* bridges
* addresses
* routes
* eventually WireGuard interfaces and peers
* eventually firewall/NAT state

Easy Router should be able to inspect this state.

## Reconciliation

The long-term mechanism for keeping these states synchronized is reconciliation.

Conceptually:

```text
                 Desired State
                  config.json
                       │
                       ▼
                ┌─────────────┐
                │ Reconciler  │
                └──────┬──────┘
                       │
                  compare state
                       │
             ┌─────────┴─────────┐
             │                   │
          matches            differs
             │                   │
             ▼                   ▼
         do nothing          apply change
```

This makes the system **idempotent**.

Running reconciliation when the machine is already correct should result in no unnecessary changes.

---

# Configuration Management

Easy Router separates application configuration from daemon configuration.

For example:

```text
DnsmasqConfig
      │
      ▼
DnsmasqService.generate_config()
      │
      ▼
dnsmasq configuration
```

The `DnsmasqService` is responsible for translating the structured Pydantic model into valid dnsmasq configuration syntax.

The same pattern is intended for other services:

```text
HostapdConfig
      ↓
HostapdService
      ↓
hostapd configuration
```

```text
WireGuardConfig
      ↓
WireGuardService
      ↓
WireGuard configuration
```

This keeps daemon-specific syntax out of the API and frontend.

---

# Service Management

Long-running services are intended to be managed by systemd.

Easy Router should communicate with systemd through a small service-management abstraction rather than scattering `systemctl` calls throughout the application.

Conceptually:

```python
class SystemdService:
    def start(...):
        ...

    def stop(...):
        ...

    def restart(...):
        ...

    def is_active(...):
        ...
```

A service such as dnsmasq can then use this abstraction:

```text
DnsmasqService
 ├── generate_config()
 ├── validate_config()
 ├── write_config()
 ├── apply()
 └── reconcile()
```

The web API does not need to know how dnsmasq works internally.

---

# Safe Configuration Application

Applying a new configuration should eventually be treated as a transactional operation.

The intended flow is:

```text
New configuration
       │
       ▼
Pydantic validation
       │
       ▼
Generate native configuration
       │
       ▼
Validate generated configuration
       │
       ▼
Save previous configuration
       │
       ▼
Install new configuration
       │
       ▼
Restart service
       │
       ▼
Verify service
       │
   ┌───┴───┐
   │       │
Success   Failure
   │       │
   ▼       ▼
 Commit   Rollback
           │
           ▼
        Restart
```

A failed configuration should not leave the router in a broken state if the previous known-good configuration can be restored.

This is particularly important for services such as DNS, DHCP, and Wi-Fi, where a bad configuration can make the router difficult to access remotely.

---

# Configuration Drift

One of the reasons for having a desired-state model is to detect configuration drift.

For example, if Easy Router expects:

```text
cache-size=10000
```

but the actual configuration has:

```text
cache-size=5000
```

the system can detect that the machine no longer matches the desired state.

Likewise, if someone manually stops dnsmasq:

```text
Desired:
    dnsmasq = running

Actual:
    dnsmasq = stopped
```

the reconciler can detect the difference and restore the service.

This allows Easy Router to move beyond being a configuration editor and become a **router state manager**.

---

# Automatic Recovery

The intended system should be able to recover from several classes of failure.

### Service crash

```text
dnsmasq crashes
      ↓
systemd restarts dnsmasq
```

Systemd should handle normal process supervision.

### Configuration drift

```text
actual configuration
        ≠
desired configuration
        ↓
Easy Router reconciliation
        ↓
restore desired configuration
```

### Machine reboot

```text
Machine boots
      ↓
systemd starts required services
      ↓
Easy Router starts
      ↓
Easy Router loads config.json
      ↓
reconciliation
      ↓
system reaches desired state
```

The exact boot ordering and dependencies will be defined as the systemd integration matures.

---

# Current Project Structure

The project is currently organized roughly as follows:

```text
src/
├── api/
│   ├── config.py
│   ├── hostapd.py
│   ├── dnsmasq.py
│   └── interfaces.py
│
├── services/
│   ├── hostapd.py
│   ├── dnsmasq.py
│   └── systemd.py
│
├── config/
│   ├── manager.py
│   ├── hostapd.py
│   └── dnsmasq.py
│
├── models/
│   └── config.py
│
└── web/
    ├── index.html
    ├── app.js
    └── style.css
```

The exact structure may evolve as the reconciliation and service-management layers become more developed.

---

# Current Components

## FastAPI

FastAPI provides the HTTP API used by the web interface.

Current API areas include:

```text
/api/interfaces
/api/config
/api/hostapd
/api/dnsmasq
```

These APIs are expected to become service-oriented rather than exposing the implementation details of individual daemon configuration files.

---

## Pydantic Configuration Models

Pydantic models define the application's representation of router configuration.

Examples include:

* `RouterConfig`
* `HostapdConfig`
* `DnsmasqConfig`

These models provide validation before configuration reaches the underlying Linux services.

---

## ConfigManager

`ConfigManager` is responsible for persistence of the desired router configuration.

Its role is intentionally different from the service layer.

```text
ConfigManager
    │
    └── manages desired state

DnsmasqService
    │
    └── manages dnsmasq

HostapdService
    │
    └── manages hostapd
```

The configuration file is not intended to be a replacement for the daemon's native configuration files.

It is Easy Router's source of truth.

---

## DnsmasqService

The dnsmasq service currently contains a configuration renderer that converts `DnsmasqConfig` into native dnsmasq syntax.

It currently handles configuration areas such as:

* network interfaces
* DNS upstream servers
* DNS caching
* DNS rebinding protection
* local DNS domains
* blocklists
* query logging
* DHCP
* DHCPv6
* IPv6 router advertisements

The next stage is to add reliable application, verification, rollback, and reconciliation.

---

## HostapdService

Hostapd is intended to provide wireless access-point functionality.

The service layer will be responsible for:

* generating hostapd configuration
* validating configuration
* applying configuration
* managing the systemd service
* detecting configuration drift
* recovering from service failures

---

# Roadmap

The project is intentionally being developed incrementally.

## Phase 1 — Configuration and API

* [x] FastAPI application
* [x] Web control panel
* [x] Network interface discovery
* [x] Pydantic configuration models
* [x] Persistent configuration
* [x] Hostapd API
* [x] Dnsmasq API
* [x] Dnsmasq configuration generation
* [ ] Complete hostapd configuration generation

## Phase 2 — Real Service Management

* [ ] Write generated dnsmasq configuration to the system
* [ ] Validate generated dnsmasq configuration
* [ ] Write generated hostapd configuration
* [ ] Validate generated hostapd configuration
* [ ] Introduce systemd service abstraction
* [ ] Start/stop/restart services through systemd
* [ ] Verify service state after applying configuration

## Phase 3 — Reconciliation

* [ ] Implement service state inspection
* [ ] Compare desired and actual configuration
* [ ] Implement `reconcile()`
* [ ] Detect configuration drift
* [ ] Automatically restore desired configuration
* [ ] Periodic reconciliation
* [ ] Service health/status API

## Phase 4 — Failure Resistance

* [ ] Atomic configuration writes
* [ ] Configuration backups
* [ ] Transactional configuration application
* [ ] Automatic rollback
* [ ] Verify service health after changes
* [ ] Handle failed service restarts
* [ ] Make Easy Router itself a systemd service
* [ ] Define correct boot ordering

## Phase 5 — Router Functionality

Planned router functionality includes:

* [ ] DHCP
* [ ] DNS
* [ ] Wi-Fi access point management
* [ ] Network bridge management
* [ ] IPv4 routing
* [ ] IPv6 routing
* [ ] NAT
* [ ] Firewall configuration
* [ ] WireGuard
* [ ] VPN routing
* [ ] DNS blocklists
* [ ] Client/device information
* [ ] Network/service status

## Phase 6 — Production Hardening

* [ ] Run the FastAPI application as a dedicated system user
* [ ] Remove the need to run the application as root
* [ ] Restrict privileged operations
* [ ] Use narrowly scoped privilege escalation where required
* [ ] Improve authentication and authorization
* [ ] Secure the web interface
* [ ] Add structured logging
* [ ] Add comprehensive service tests
* [ ] Add integration tests against real Linux services

---

# Design Principles

### Desired state over imperative commands

The preferred model is:

```text
"Make the router look like this."
```

rather than:

```text
"Run these commands."
```

This makes recovery and automation significantly easier.

### Idempotency

Applying the same desired configuration multiple times should be safe.

```text
apply(config)
apply(config)
apply(config)
```

should leave the system in the same state as a single successful application.

### Native Linux services

Easy Router should work with the Linux networking stack rather than replacing it with a collection of custom daemons.

Services such as systemd, hostapd, dnsmasq, WireGuard, and the Linux networking stack remain responsible for the low-level work.

### Separation of concerns

The project separates:

```text
Frontend
    ↓
API
    ↓
Configuration models
    ↓
Reconciliation
    ↓
Service implementations
    ↓
systemd / Linux
```

Each layer should have a clearly defined responsibility.

### Recoverability

A configuration change should be considered successful only when the resulting system is known to be healthy.

---

# Development

During development, the application can be run with Uvicorn.

For example:

```bash
uv run uvicorn main:app --reload
```

The development server should not be confused with the eventual production deployment.

In the production router, Easy Router itself is intended to run as a systemd-managed service, without the development `--reload` option.

---

# Long-Term Vision

Easy Router is intended to become more than a web interface for editing `hostapd.conf` and `dnsmasq.conf`.

The long-term vision is a **desired-state Linux router manager**.

A user should be able to configure the router through the web interface:

```text
Wi-Fi
DNS
DHCP
IPv4
IPv6
Firewall
NAT
VPN
WireGuard
```

without needing to manually edit multiple daemon configuration files.

Easy Router then translates that high-level configuration into the appropriate native Linux configuration and continuously ensures that the machine matches the desired state.

The fundamental model is:

```text
                    ┌──────────────────┐
                    │   Desired State  │
                    │                  │
                    │    config.json   │
                    └────────┬─────────┘
                             │
                             ▼
                       Reconciliation
                             │
                             ▼
                    ┌──────────────────┐
                    │   Actual Linux   │
                    │      State       │
                    └──────────────────┘
```

If the two states differ, Easy Router brings the actual system back toward the desired state.

That architecture is intended to make the router **persistent, recoverable, observable, and manageable without tying its operation to the browser or any single user session**.
