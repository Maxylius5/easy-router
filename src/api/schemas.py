from src.models.network import InterfaceType
from pydantic import BaseModel, ConfigDict, Field

from src.models.network import InterfaceType

class InterfaceCapabilitiesResponse:
    """Base API representation of interface capabilities."""








class CapabilitiesResponse(BaseModel):
    """Base response model for interface capabilities."""

    model_config = ConfigDict(
        extra="forbid",
    )


class EthernetCapabilitiesResponse(
    CapabilitiesResponse
):
    """Ethernet capability information."""

    wan: bool = False
    lan: bool = False


class WifiCapabilitiesResponse(
    CapabilitiesResponse
):
    """Wi-Fi capability information."""

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


class NetworkInterfaceResponse(BaseModel):
    """API representation of a network interface."""

    name: str
    mac_address: str
    is_physical: bool
    interface_type: InterfaceType
    state: str
    driver: str | None = None

    capabilities: (
        CapabilitiesResponse
        | EthernetCapabilitiesResponse
        | WifiCapabilitiesResponse
    )
