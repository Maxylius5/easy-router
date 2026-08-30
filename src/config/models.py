from pydantic import BaseModel, Field

from src.services.hostapd.models import HostapdConfig


class RouterConfig(BaseModel):
    """Complete desired configuration for Easy Router."""

    version: int = 1

    hostapd: HostapdConfig | None = None

