import subprocess

from pathlib import Path

from models.network import (
    Capabilities,
    EthernetCapabilities,
    EthernetInterface,
    InterfaceType,
    NetworkInterface,
    WifiCapabilities,
    WifiInterface,
)


class Scanner:
    def __init__(self) -> None:
        self.network_path = Path("/sys/class/net")

    def discover(self) -> list[NetworkInterface]:
        interfaces = []

        for interface_path in self.network_path.iterdir():
            name = interface_path.name

            mac_address = (
                interface_path / "address"
            ).read_text().strip()

            state = (
                interface_path / "operstate"
            ).read_text().strip()

            is_physical = (
                interface_path / "device"
            ).exists()

            interface_type = self._get_interface_type(
                interface_path
            )

            driver = self._get_driver(interface_path)

            interface = self._create_interface(
                name=name,
                mac_address=mac_address,
                is_physical=is_physical,
                interface_type=interface_type,
                state=state,
                driver=driver,
            )

            interfaces.append(interface)

        return interfaces

    def _create_interface(
        self,
        name: str,
        mac_address: str,
        is_physical: bool,
        interface_type: InterfaceType,
        state: str,
        driver: str | None,
    ) -> NetworkInterface:

        if interface_type == InterfaceType.WIFI:
            capabilities = self._get_wifi_capabilities(name)

            return WifiInterface(
                name=name,
                mac_address=mac_address,
                is_physical=is_physical,
                interface_type=interface_type,
                state=state,
                driver=driver,
                capabilities=capabilities,
            )

        if interface_type == InterfaceType.ETHERNET:
            capabilities = EthernetCapabilities(
                wan=True,
                lan=True,
            )

            return EthernetInterface(
                name=name,
                mac_address=mac_address,
                is_physical=is_physical,
                interface_type=interface_type,
                state=state,
                driver=driver,
                capabilities=capabilities,
            )

        return NetworkInterface(
            name=name,
            mac_address=mac_address,
            is_physical=is_physical,
            interface_type=interface_type,
            state=state,
            driver=driver,
            capabilities=Capabilities(),
        )

    def _get_interface_type(
        self,
        interface_path: Path,
    ) -> InterfaceType:

        name = interface_path.name

        # Loopback
        if name == "lo":
            return InterfaceType.LOOPBACK

        # Linux bridge
        if (interface_path / "bridge").exists():
            return InterfaceType.BRIDGE

        # Virtual Ethernet
        if name.startswith("veth"):
            return InterfaceType.VETH

        # Wi-Fi devices normally have a wireless directory.
        if (
            (interface_path / "wireless").exists()
            or (interface_path / "phy80211").exists()
        ):
            return InterfaceType.WIFI

        # Physical network device without wireless capabilities.
        if (
            interface_path / "device"
        ).exists():
            return InterfaceType.ETHERNET

        return InterfaceType.OTHER

    def _get_driver(
        self,
        interface_path: Path,
    ) -> str | None:

        driver_path = interface_path / "device" / "driver"

        if not driver_path.exists():
            return None

        try:
            return driver_path.resolve().name
        except OSError:
            return None

    def _get_wifi_capabilities(
        self,
        interface_name: str,
    ) -> WifiCapabilities:

        capabilities = WifiCapabilities()

        result = subprocess.run(
            ["iw", "dev", interface_name, "info"],
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            return capabilities

        output = result.stdout

        # If `iw` can inspect the device, it is capable of
        # operating as a normal Wi-Fi client.
        capabilities.client = True

        # Get the physical radio associated with this interface.
        phy = self._get_phy(interface_name)

        if phy is None:
            return capabilities

        result = subprocess.run(
            ["iw", "phy", phy, "info"],
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            return capabilities

        output = result.stdout

        capabilities.access_point = (
            "* AP" in output
            or "* AP/VLAN" in output
        )

        capabilities.monitor = (
            "* monitor" in output
        )

        capabilities.wifi_standards = (
            self._detect_wifi_standards(output)
        )

        return capabilities

    def _get_phy(
        self,
        interface_name: str,
    ) -> str | None:

        result = subprocess.run(
            ["iw", "dev", interface_name, "info"],
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            return None

        for line in result.stdout.splitlines():
            line = line.strip()

            if line.startswith("wiphy"):
                parts = line.split()

                if len(parts) >= 2:
                    return f"phy{parts[1]}"

        return None

    def _detect_wifi_standards(
        self,
        iw_output: str,
    ) -> list[str]:

        standards = []

        # These are intentionally basic for now.
        # We'll make this more accurate later.
        if "EHT" in iw_output:
            standards.append("Wi-Fi 7")

        if "HE" in iw_output:
            standards.append("Wi-Fi 6")

        if "VHT" in iw_output:
            standards.append("Wi-Fi 5")

        if "HT" in iw_output:
            standards.append("Wi-Fi 4")

        return standards