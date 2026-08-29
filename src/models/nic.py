from models.capabiliteis import NICCapabilities, WifiCapabilities



class NIC:
    id: str
    name: str
    mac_address: str
    driver: str



class WifiNIC(NIC):
    capabilities: WifiCapabilities


class EthernetNIC(NIC):
    speed_mbps: int