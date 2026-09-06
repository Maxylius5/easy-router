from pydantic import BaseModel, Field

from src.models.config import WifiConfig, DnsmasqConfig


class RouterConfig(BaseModel):
    """Complete desired configuration for Easy Router."""

    version: int = 1

    hostapd: WifiConfig | None = None
    dnsmasq: DnsmasqConfig

