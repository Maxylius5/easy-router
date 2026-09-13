from pydantic import BaseModel, Field

from src.models.config import WifiConfig, DnsmasqConfig, WgConfig


class RouterConfig(BaseModel):
    """Complete desired configuration for Easy Router."""

    version: int = 1

    hostapd: WifiConfig | None = None
    dnsmasq: DnsmasqConfig
    wireguard: WgConfig


