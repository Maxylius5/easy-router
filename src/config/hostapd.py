from enum import Enum

from pydantic import BaseModel, Field


class WifiBand(str, Enum):
    BAND_2_4_GHZ = "2.4ghz"
    BAND_5_GHZ = "5ghz"
    BAND_6_GHZ = "6ghz"


class WifiSecurity(str, Enum):
    OPEN = "open"
    WPA2 = "wpa2"
    WPA3 = "wpa3"
    WPA2_WPA3 = "wpa2_wpa3"


class HostapdConfig(BaseModel):
    enabled: bool = False

    interface: str

    ssid: str = Field(
        min_length=1,
        max_length=32,
    )

    band: WifiBand

    channel: int | None = None

    channel_width_mhz: int | None = None

    security: WifiSecurity = WifiSecurity.WPA2

    password: str | None = None