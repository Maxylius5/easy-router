from enum import Enum

from pydantic import BaseModel, Field


class InterfaceType(str, Enum):
    """Supported Linux network interface types."""

    UNKNOWN = "unknown"
    LOOPBACK = "loopback"
    ETHERNET = "ethernet"
    WIFI = "wifi"
    BRIDGE = "bridge"
    VETH = "veth"
    OTHER = "other"


class Capabilities(BaseModel):
    """Base model for interface capabilities."""

    model_config = {
        "extra": "forbid",
    }


class EthernetCapabilities(Capabilities):
    """Capabilities of an Ethernet interface."""

    wan: bool = False
    lan: bool = False


class WifiCapabilities(Capabilities):
    """Capabilities reported by a Wi-Fi radio."""

    client: bool = False
    access_point: bool = False
    monitor: bool = False

    wifi_4: bool = False
    wifi_5: bool = False
    wifi_6: bool = False
    wifi_6e: bool = False
    wifi_7: bool = False

    band_2_4ghz: bool = False
    band_5ghz: bool = False
    band_6ghz: bool = False

    max_channel_width_mhz: int | None = None

    max_rx_rate_mbps: int | None = None
    max_tx_rate_mbps: int | None = None

    mimo_streams: int | None = None

    supported_frequencies_mhz: list[int] = Field(
        default_factory=list
    )

    interface_modes: list[str] = Field(
        default_factory=list
    )


class NetworkInterface(BaseModel):
    """Base representation of a Linux network interface."""

    name: str
    mac_address: str
    is_physical: bool
    interface_type: InterfaceType
    state: str
    driver: str | None = None

    capabilities: Capabilities = Field(
        default_factory=Capabilities
    )


class WifiInterface(NetworkInterface):
    """Representation of a Wi-Fi network interface."""

    interface_type: InterfaceType = InterfaceType.WIFI

    capabilities: WifiCapabilities = Field(
        default_factory=WifiCapabilities
    )


class EthernetInterface(NetworkInterface):
    """Representation of an Ethernet network interface."""

    interface_type: InterfaceType = InterfaceType.ETHERNET

    capabilities: EthernetCapabilities = Field(
        default_factory=EthernetCapabilities
    )

