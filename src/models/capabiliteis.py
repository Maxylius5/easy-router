
from enum import Enum


class WifiStandard(Enum):
    WIFI_4 = "802.11n"
    WIFI_5 = "802.11ac"
    WIFI_6 = "802.11ax"
    WIFI_6E = "802.11ax-6GHz"
    WIFI_7 = "802.11be"


standards = {
    WifiStandard.WIFI_4,
    WifiStandard.WIFI_5,
    WifiStandard.WIFI_6,
}

class WifiCapabilities:
    can_client: bool
    can_ap: bool
    can_monitor: bool

    standards: set[str]

class NICCapabilities:
    can_client: bool
    can_ap: bool
    can_monitor: bool
    can_bridge: bool







