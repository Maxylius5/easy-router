from src.inventory.scanner import Scanner
from src.models.network import WifiInterface

from src.inventory.scanner import Scanner

def main():

    scanner = Scanner()

    interfaces = scanner.discover()

    for interface in interfaces:
        print(f"\n{interface.name}")
        print(f"  Type:       {interface.interface_type.value}")
        print(f"  MAC:        {interface.mac_address}")
        print(f"  Physical:   {interface.is_physical}")
        print(f"  State:      {interface.state}")
        print(f"  Driver:     {interface.driver}")

        if isinstance(interface, WifiInterface):
            capabilities = interface.capabilities

            print("  Wi-Fi:")
            print(f"    Client:    {capabilities.client}")
            print(f"    AP:        {capabilities.access_point}")
            print(f"    Monitor:   {capabilities.monitor}")
            print(
                f"    Standards: "
                f"{', '.join(capabilities.wifi_standards)}"
            )


if __name__ == "__main__":
    main()

    