from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class WifiConfig:
    enabled: bool = False
    interface: str = ""
    ssid: str = ""
    password: str = ""

    country: str = "NL"
    channel: int = 6


@dataclass
class DhcpConfig:
    enabled: bool = False
    interface: str = ""

    network: str = "192.168.10.0/24"
    gateway: str = "192.168.10.1"

    range_start: str = "192.168.10.100"
    range_end: str = "192.168.10.200"

    lease_time: str = "12h"


@dataclass
class WireGuardConfig:
    enabled: bool = False
    interface: str = "wg0"

    address: str = "10.0.0.1/24"
    listen_port: int = 51820


@dataclass
class RouterConfig:
    wifi: WifiConfig = field(default_factory=WifiConfig)
    dhcp: DhcpConfig = field(default_factory=DhcpConfig)
    wireguard: WireGuardConfig = field(
        default_factory=WireGuardConfig
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)



    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RouterConfig":
        return cls(
            wifi=WifiConfig(**data.get("wifi", {})),
            dhcp=DhcpConfig(**data.get("dhcp", {})),
            wireguard=WireGuardConfig(**data.get("wireguard", {})),
        )


