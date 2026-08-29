from dataclasses import dataclass, field
from enum import Enum


class InterfaceType(Enum):
    UNKNOWN = "unknown"
    LOOPBACK = "loopback"
    ETHERNET = "ethernet"
    WIFI = "wifi"
    BRIDGE = "bridge"
    VETH = "veth"
    OTHER = "other"


@dataclass
class Capabilities:
    pass


@dataclass
class WifiCapabilities(Capabilities):
    client: bool = False
    access_point: bool = False
    monitor: bool = False
    wifi_standards: list[str] = field(default_factory=list)


@dataclass
class EthernetCapabilities(Capabilities):
    pass


@dataclass
class NetworkInterface:
    name: str
    mac_address: str
    is_physical: bool
    interface_type: InterfaceType
    state: str
    driver: str | None = None
    capabilities: Capabilities = field(
        default_factory=Capabilities
    )


@dataclass
class WifiInterface(NetworkInterface):
    capabilities: WifiCapabilities = field(
        default_factory=WifiCapabilities
    )


@dataclass
class EthernetInterface(NetworkInterface):
    capabilities: EthernetCapabilities = field(
        default_factory=EthernetCapabilities
    )