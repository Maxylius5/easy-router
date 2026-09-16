# Easy Router

Easy Router is a Linux router management system designed to provide a simple, centralized way to configure and operate common router services.

The long-term goal is to provide a WebUI and API through which users can configure services such as:

* dnsmasq
* hostapd
* WireGuard
* nftables
* and other router-related services

Easy Router manages the configuration state of these services while allowing each service to retain responsibility for its own configuration format and system-level behavior.

> **Status:** Easy Router is currently under active development. The configuration and service-management architecture is being built before the WebUI is finalized.

---

## Architecture

Easy Router is built around three main responsibilities:

```text
                 WebUI / API
                     │
                     ▼
              Service classes
                     │
          validate / generate config
                     │
                     ▼
              ConfigManager
             /              \
            ▼                ▼
       desired/           actual/
            │                ▲
            │                │
            └──────┐   ┌─────┘
                   ▼   │
               RouterManager
                   │
                   ▼
             Service.apply()
                   │
                   ▼
             Linux services
```

### Services

Each supported service has its own service class.

For example:

```text
DnsmasqService
HostapdService
WireguardService
NftablesService
```

A service is responsible for understanding its own configuration and native configuration format.

A service can provide operations such as:

```python
validate_config()
generate_config()
test_config()
write_config()
apply()
```

For example, `HostapdService.generate_config()` converts a `WifiConfig` model into native `hostapd` configuration text.

The service therefore knows **how to configure hostapd**, but it does not need to know how Easy Router stores its desired and actual state.

---

## Configuration State

Easy Router maintains two configuration states:

```text
~/.config/easy-router/
├── desired/
│   ├── dnsmasq.json
│   ├── hostapd.json
│   ├── wireguard.json
│   └── nftables.json
│
└── actual/
    ├── dnsmasq.json
    ├── hostapd.json
    ├── wireguard.json
    └── nftables.json
```

### Desired state

`desired/` contains what the user wants Easy Router to configure.

For example:

```text
~/.config/easy-router/desired/hostapd.json
```

is the desired hostapd configuration.

The API writes to this state after validating the user's requested configuration.

### Actual state

`actual/` contains the configuration that Easy Router has **successfully applied**.

It is not simply another copy of the desired configuration.

For example, if a new hostapd configuration fails validation or cannot be applied:

```text
desired/hostapd.json
        │
        │ new configuration
        ▼
     FAILED
```

the existing:

```text
actual/hostapd.json
```

remains unchanged.

This makes the difference between desired and actual state useful for determining whether reconciliation is required.

---

## ConfigManager

`ConfigManager` is responsible only for configuration persistence.

It does not know how dnsmasq, hostapd, WireGuard, or nftables work.

Its job is to read and write service configuration state:

```python
config_manager.save_desired("hostapd", config)

config_manager.load_desired("hostapd", HostapdConfig)

config_manager.save_actual("hostapd", config)

config_manager.load_actual("hostapd", HostapdConfig)
```

This keeps configuration storage independent from individual services.

---

## Native Configuration

Easy Router does not use the JSON files as native daemon configuration.

Instead, the service converts its internal configuration model into the configuration format required by the underlying Linux service.

For example:

```text
desired/hostapd.json
        │
        ▼
   WifiConfig
        │
        ▼
HostapdService.generate_config()
        │
        ▼
hostapd configuration
        │
        ▼
/etc/easy-router/hostapd/
```

The same pattern can be used for every supported service.

The JSON configuration is Easy Router's representation of configuration state, while the generated configuration is the representation required by the underlying daemon.

---

## Reconciliation

The long-term architecture is based around reconciliation.

`RouterManager` acts as the coordinator between configuration state and the actual services.

Conceptually:

```text
                  desired
                     │
                     ▼
              compare with actual
                     │
              ┌──────┴──────┐
              │             │
            equal        different
              │             │
              ▼             ▼
             done       validate
                            │
                            ▼
                         test
                            │
                            ▼
                     generate/write
                            │
                            ▼
                          apply
                            │
                     successful?
                       /       \
                     no         yes
                     │           │
                     ▼           ▼
               keep actual   save actual
```

This means Easy Router does not blindly apply every configuration request.

Instead, it determines whether the desired state differs from the last successfully applied state and only performs the necessary work.

---

## Safe Configuration Changes

Configuration changes should be applied in a controlled sequence:

1. Load the desired configuration.
2. Compare it with the actual configuration.
3. Validate the desired configuration.
4. Generate the native service configuration.
5. Test the generated configuration where possible.
6. Write the native configuration.
7. Apply or reload the service.
8. Verify that the service successfully started or reloaded.
9. Only then update the actual state.

If a step fails, the actual state should not be updated to the failed desired state.

This provides a clear distinction between:

```text
What the user requested
```

and:

```text
What Easy Router successfully applied
```

---

## System Integration

Easy Router interacts with Linux services through dedicated service classes and shared system-management components.

A low-level `SystemdManager` provides operations such as:

```python
start()
stop()
restart()
```

Service-specific classes can use these operations when applying their own configuration.

The higher-level `RouterManager` should not need to know the details of individual systemd units. It asks the appropriate service to apply its configuration.

This keeps service-specific knowledge inside the service implementation.

---

## API

The API provides access to individual service configurations.

For example:

```text
GET /api/dnsmasq
PUT /api/dnsmasq

GET /api/hostapd
PUT /api/hostapd
```

A `PUT` request represents a request to change the desired configuration.

The API validates the configuration and stores it as desired state.

The actual application of the configuration is handled by the reconciliation layer rather than directly by the API endpoint.

This separation allows configuration changes to eventually be applied asynchronously and consistently.

---

## WebUI

The WebUI is intended to provide a simple interface for managing the router.

The frontend is deliberately kept separate from the service and configuration architecture.

The long-term goal is for the WebUI to interact with the API without needing to know how individual Linux services are configured internally.

For example:

```text
WebUI
  │
  ▼
API
  │
  ▼
DnsmasqConfig
  │
  ▼
DnsmasqService
  │
  ▼
Linux dnsmasq
```

---

## Long-Term Goals

The project is intended to evolve toward a complete router management platform with:

* Centralized configuration management
* Desired/actual state reconciliation
* Safe configuration validation
* Native configuration generation
* Service-specific configuration testing
* Controlled service reloads and restarts
* Configuration drift detection
* Service health verification
* Atomic or rollback-safe configuration updates
* Support for multiple router services
* REST API
* WebUI
* Clear reporting of configuration and service status

Eventually, Easy Router should be able to answer questions such as:

```text
Is the router configured as requested?
Is the running service healthy?
Is there configuration drift?
What configuration failed to apply?
What is currently desired?
What was last successfully applied?
```

---

## Project Structure

The project is organized around separating configuration persistence, service-specific logic, and orchestration:

```text
src/
├── api/
│   └── ...
│
├── config/
│   └── manager.py
│
├── models/
│   └── ...
│
├── services/
│   ├── base.py
│   ├── dnsmasq.py
│   ├── hostapd.py
│   ├── wireguard.py
│   └── ...
│
└── ...
```

The exact structure will evolve as the project grows, but the separation of responsibilities is intended to remain:

```text
ConfigManager
    → configuration persistence

Service classes
    → service-specific configuration and operations

RouterManager
    → orchestration and reconciliation

SystemdManager
    → low-level systemd interaction

API
    → external configuration interface

WebUI
    → user interface
```

---

## Development Status

Easy Router is currently a work in progress.

The current development focus is on establishing the backend architecture:

1. Configuration models
2. Service classes
3. Configuration persistence
4. Desired/actual state handling
5. Service configuration generation and testing
6. Reconciliation through `RouterManager`
7. Safe service application
8. API
9. WebUI

The goal is to establish a reliable configuration and reconciliation system first, then build the user interface on top of it.
