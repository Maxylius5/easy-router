# Easy Router

> A Python project for discovering, inspecting, and eventually managing network interfaces and router capabilities on Linux.

Easy Router is a learning-focused networking project written in Python.

The goal is to build a small, modular network management system from the ground up — starting with discovering the network hardware available on a Linux machine and gradually building toward higher-level router and network management functionality.

---

## 🚧 Project Status

**Early development**

The project currently focuses on **network interface discovery and hardware inspection**.

At the moment, Easy Router can:

* Discover network interfaces through `/sys/class/net`
* Read MAC addresses
* Determine whether an interface represents physical hardware
* Identify interface types
* Read interface state
* Detect the network driver
* Inspect Wi-Fi capabilities using Linux `iw`
* Distinguish between physical and virtual interfaces
* Extract information about Wi-Fi bands and standards

More functionality will be added incrementally.

---

## 🎯 Goals

The long-term goal is to turn low-level Linux networking information into clean Python objects that the rest of the application can work with.

Instead of having the rest of the application deal with raw Linux commands such as:

```text
iw phy phy0 info
ip link
/sys/class/net/...
```

the scanner should eventually expose a clean Python representation such as:

```python
NetworkInterface(
    name="wlp4s0",
    type="wifi",
    mac_address="1c:bf:c0:ce:bf:81",
    is_physical=True,
    state="up",
    driver="rtw89_8852be",
    capabilities=...
)
```

This creates a separation between:

```text
Linux / sysfs / iw
        │
        ▼
     Scanner
        │
        ▼
   Python models
        │
        ▼
 Application logic
```

---

## 🏗️ Architecture

The project is structured around a few important concepts.

### Scanner

The `Scanner` is responsible for communicating with the Linux system and discovering available networking hardware.

It should handle things such as:

* `/sys/class/net`
* Linux network interface information
* `iw`
* `ip`
* Hardware capabilities
* Wi-Fi information

The scanner converts this low-level information into Python objects.

---

### Models

Models represent the things Easy Router knows about.

For example:

```text
NetworkInterface
    │
    ├── name
    ├── mac_address
    ├── type
    ├── state
    ├── driver
    ├── is_physical
    │
    └── capabilities
            │
            ├── wifi
            ├── ethernet
            └── ...
```

The important idea is that the models should describe **what something is**, while the scanner describes **how to find out what it is**.

---

## 🌐 Network Interfaces

Linux exposes network interfaces through:

```text
/sys/class/net/
```

For example, a machine might contain:

```text
wlp4s0
eno1
lo
docker0
virbr0
veth...
br-...
```

Not every interface represents physical hardware.

Easy Router therefore distinguishes between physical and virtual interfaces.

### Physical interfaces

Examples:

```text
wlp4s0
eno1
```

These represent actual networking hardware.

### Virtual interfaces

Examples:

```text
docker0
virbr0
veth...
br-...
lo
```

These are created by the operating system or other software.

They can still be useful, but they are generally not the hardware that Easy Router is primarily interested in.

---

## 📡 Wi-Fi

Wi-Fi interfaces receive additional information from Linux's `iw` utility.

For example:

```bash
iw dev wlp4s0 info
```

can provide information such as:

```text
SSID
channel
frequency
channel width
transmit power
interface mode
wiphy
```

Hardware capabilities can be inspected with:

```bash
iw phy phy0 info
```

This provides much more detailed information, including:

* Supported bands
* 2.4 GHz support
* 5 GHz support
* HT / 802.11n
* VHT / 802.11ac
* HE / 802.11ax
* Supported channel widths
* MIMO streams
* Supported MCS rates
* Supported interface modes
* Supported ciphers
* Transmit power
* Supported frequencies
* Driver capabilities

The scanner will progressively convert this information into structured Python models.

---

## 📶 Wi-Fi Capability Model

Rather than storing the output of `iw` as a giant string, Easy Router aims to represent capabilities using Python objects.

Conceptually:

```python
WifiCapabilities(
    wifi_4=True,
    wifi_5=True,
    wifi_6=True,

    band_2_4ghz=True,
    band_5ghz=True,

    max_channel_width=80,
    max_rx_rate=867,
    max_tx_rate=867,

    mimo_streams=2,
)
```

This makes it possible for application code to ask meaningful questions:

```python
if interface.capabilities.wifi_6:
    ...
```

instead of parsing command output everywhere.

---

## 🔌 Ethernet

Ethernet interfaces will eventually receive their own capability model.

For example:

```python
EthernetCapabilities(
    speed=1000,
    full_duplex=True,
    auto_negotiation=True,
)
```

The exact model will evolve as the project discovers which information is actually useful.

---

## 🧩 Planned Models

The project will likely grow toward models such as:

```text
NetworkInterface
│
├── WifiCapabilities
│
├── EthernetCapabilities
│
└── ...
```

Additional models may eventually represent:

```text
Network
Router
AccessPoint
Connection
IPAddress
Route
DNS
DHCP
Firewall
```

These will only be introduced when they become useful.

The goal is to avoid creating large amounts of abstraction before the underlying requirements are understood.

---

## 🔍 Discovery Process

The current discovery process starts with Linux's network interface filesystem:

```text
/sys/class/net/
```

For every interface, Easy Router reads information such as:

```text
name
MAC address
physical / virtual
state
driver
type
```

A simplified flow looks like:

```text
/sys/class/net/
        │
        ├── wlp4s0
        ├── eno1
        ├── docker0
        ├── lo
        └── ...
                │
                ▼
             Scanner
                │
                ▼
       NetworkInterface objects
```

For Wi-Fi interfaces, the scanner can then continue deeper:

```text
NetworkInterface
        │
        └── Wi-Fi
              │
              ├── iw dev
              │
              └── iw phy
                     │
                     ▼
              WifiCapabilities
```

---

## 🐧 Linux

Easy Router currently targets **Linux**.

This is intentional.

The project relies on Linux networking interfaces and utilities such as:

```text
/sys/class/net
iw
ip
```

These provide detailed information about the networking hardware and its capabilities.

Support for other operating systems may be considered in the future, but it is not currently a goal.

---

## 📁 Project Structure

The project is gradually being organized into separate responsibilities.

A possible structure is:

```text
easy-router/
│
├── main.py
│
├── models/
│   ├── __init__.py
│   └── network.py
│
├── scanner/
│   ├── __init__.py
│   └── scanner.py
│
├── tests/
│
├── pyproject.toml
├── uv.lock
└── README.md
```

The structure may change as the project grows.

The important principle is:

```text
models/
    What things are

scanner/
    How things are discovered

main.py
    How the application is run
```

---

## ▶️ Running

The project uses Python and `uv`.

Run the application with:

```bash
uv run main.py
```

Example output:

```text
wlp4s0
  Type:       wifi
  MAC:        1c:bf:c0:ce:bf:81
  Physical:   True
  State:      up
  Driver:     rtw89_8852be

eno1
  Type:       ethernet
  MAC:        bc:fc:e7:00:6a:71
  Physical:   True
  State:      down
  Driver:     r8169
```

Virtual interfaces may also be discovered:

```text
docker0
  Type:       bridge
  Physical:   False
  State:      up
  Driver:     None
```

These are retained by the scanner because they are still valid Linux network interfaces, even though they are not physical networking hardware.

---

## 🧠 Design Philosophy

Easy Router is being built incrementally.

Instead of attempting to implement an entire router management system immediately, the project starts at the lowest useful level:

```text
Discover hardware
       ↓
Understand hardware
       ↓
Model hardware
       ↓
Discover networks
       ↓
Model networks
       ↓
Interact with networking
       ↓
Build higher-level functionality
```

Each layer should provide clean information to the layer above it.

The scanner should not become the entire application.

Likewise, the models should not contain Linux-specific command execution.

---

## 🛠️ Development

The project is primarily an exploration of:

* Python
* Object-oriented design
* Linux networking
* Network interfaces
* Wi-Fi standards
* `sysfs`
* `iw`
* `iproute2`
* Hardware capability detection
* Data modeling
* Separation of concerns

The project intentionally favors understandable code over premature abstraction.

---

## 🗺️ Roadmap

### Phase 1 — Interface Discovery

* [x] Discover network interfaces
* [x] Read MAC addresses
* [x] Detect physical interfaces
* [x] Detect interface state
* [x] Detect drivers
* [x] Detect interface types

### Phase 2 — Hardware Capabilities

* [x] Detect Wi-Fi interfaces
* [x] Read Wi-Fi hardware information
* [ ] Parse Wi-Fi bands
* [ ] Detect Wi-Fi 4 / 5 / 6
* [ ] Detect channel widths
* [ ] Detect MIMO capabilities
* [ ] Detect maximum supported rates
* [ ] Create structured capability models
* [ ] Add Ethernet capabilities

### Phase 3 — Network Discovery

* [ ] Discover IP addresses
* [ ] Discover IPv4 networks
* [ ] Discover IPv6 networks
* [ ] Discover gateways
* [ ] Discover routes
* [ ] Discover DNS configuration
* [ ] Detect active connections

### Phase 4 — Wi-Fi Discovery

* [ ] Scan for nearby Wi-Fi networks
* [ ] Parse SSIDs
* [ ] Parse BSSIDs
* [ ] Parse signal strength
* [ ] Parse channels
* [ ] Detect security types
* [ ] Detect Wi-Fi standards

### Phase 5 — Router Functionality

* [ ] Represent networks
* [ ] Manage interfaces
* [ ] Configure connections
* [ ] Router configuration
* [ ] DHCP
* [ ] DNS
* [ ] Firewall
* [ ] NAT

---

## ⚠️ Current Limitations

Easy Router is currently an experimental project.

The scanner relies on Linux-specific functionality and command output, so behavior may differ between distributions, kernel versions, drivers, and hardware.

In particular, Wi-Fi capability detection is intentionally being built around the information exposed by the Linux wireless stack rather than assuming that a particular hardware model always behaves the same way.

---

## 📜 License

License information will be added as the project develops.
