from typing import Any

from pydantic import BaseModel, Field


class WifiConfig(BaseModel):
    enabled: bool = False
    interface: str = ""
    ssid: str = ""
    password: str = ""

    country: str = "NL"
    channel: int = 6


class DhcpConfig(BaseModel):
    enabled: bool = False
    interface: str = ""

    network: str = "192.168.10.0/24"
    gateway: str = "192.168.10.1"

    range_start: str = "192.168.10.100"
    range_end: str = "192.168.10.200"

    lease_time: str = "12h"


class WireGuardConfig(BaseModel):
    enabled: bool = False
    interface: str = "wg0"

    address: str = "10.0.0.1/24"
    listen_port: int = 51820


class RouterConfig(BaseModel):
    wifi: WifiConfig = Field(default_factory=WifiConfig)
    dhcp: DhcpConfig = Field(default_factory=DhcpConfig)
    wireguard: WireGuardConfig = Field(
        default_factory=WireGuardConfig
    )

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RouterConfig":
        return cls.model_validate(data)