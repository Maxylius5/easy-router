from models.nic import NIC

class RouterTopology:
    wan: NIC
    lan: list[NIC]
    vpn: ...