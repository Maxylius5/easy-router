import subprocess
from pathlib import Path

from src.models.network import (
    Capabilities,
    EthernetCapabilities,
    EthernetInterface,
    InterfaceType,
    NetworkInterface,
    WifiCapabilities,
    WifiInterface,
)


class Scanner:
    """Discover network interfaces and their capabilities."""

    def __init__(
        self,
        network_path: Path = Path("/sys/class/net"),
    ) -> None:
        self.network_path = network_path

    def discover(self) -> list[NetworkInterface]:
        """Discover all network interfaces on the system."""

        if not self.network_path.exists():
            return []

        interfaces: list[NetworkInterface] = []

        for interface_path in sorted(self.network_path.iterdir()):
            interface = self._create_interface(
                interface_path
            )

            if interface is not None:
                interfaces.append(interface)

        return interfaces

    def _create_interface(
        self,
        interface_path: Path,
    ) -> NetworkInterface | None:
        """Create a network interface model."""

        try:
            name = interface_path.name

            mac_address = (
                interface_path / "address"
            ).read_text().strip()

            state = (
                interface_path / "operstate"
            ).read_text().strip()

        except OSError:
            return None

        is_physical = (
            interface_path / "device"
        ).exists()

        interface_type = self._get_interface_type(
            interface_path
        )

        driver = self._get_driver(
            interface_path
        )

        if interface_type == InterfaceType.WIFI:
            capabilities = self._get_wifi_capabilities(
                name
            )

            return WifiInterface(
                name=name,
                mac_address=mac_address,
                is_physical=is_physical,
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
        """Determine the type of a network interface."""

        name = interface_path.name

        if name == "lo":
            return InterfaceType.LOOPBACK

        if (interface_path / "bridge").exists():
            return InterfaceType.BRIDGE

        if name.startswith("veth"):
            return InterfaceType.VETH

        if (
            (interface_path / "wireless").exists()
            or (interface_path / "phy80211").exists()
        ):
            return InterfaceType.WIFI

        if (interface_path / "device").exists():
            return InterfaceType.ETHERNET

        return InterfaceType.OTHER

    def _get_driver(
        self,
        interface_path: Path,
    ) -> str | None:
        """Get the kernel driver used by an interface."""

        driver_path = (
            interface_path / "device" / "driver"
        )

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
        """Discover Wi-Fi capabilities using iw."""

        capabilities = WifiCapabilities()

        interface_info = self._run_iw(
            "dev",
            interface_name,
            "info",
        )

        if interface_info is None:
            return capabilities

        capabilities.client = True

        phy = self._get_phy(
            interface_info
        )

        if phy is None:
            return capabilities

        phy_info = self._run_iw(
            "phy",
            phy,
            "info",
        )

        if phy_info is None:
            return capabilities

        capabilities.access_point = (
            "* AP" in phy_info
            or "* AP/VLAN" in phy_info
        )

        capabilities.monitor = (
            "* monitor" in phy_info
        )

        capabilities.interface_modes = (
            self._get_interface_modes(
                phy_info
            )
        )

        self._detect_wifi_standards(
            phy_info,
            capabilities,
        )

        return capabilities

    def _run_iw(
        self,
        *arguments: str,
    ) -> str | None:
        """Run iw and return stdout if successful."""

        try:
            result = subprocess.run(
                ["iw", *arguments],
                capture_output=True,
                text=True,
                check=False,
            )
        except OSError:
            return None

        if result.returncode != 0:
            return None

        return result.stdout

    def _get_phy(
        self,
        interface_info: str,
    ) -> str | None:
        """Extract the PHY name from iw output."""

        for line in interface_info.splitlines():
            line = line.strip()

            if not line.startswith("wiphy"):
                continue

            parts = line.split()

            if len(parts) >= 2:
                return f"phy{parts[1]}"

        return None

    def _get_interface_modes(
        self,
        iw_output: str,
    ) -> list[str]:
        """Extract supported interface modes."""

        modes: list[str] = []

        inside_modes = False

        for line in iw_output.splitlines():
            stripped = line.strip()

            if stripped == "Supported interface modes:":
                inside_modes = True
                continue

            if inside_modes:
                if not stripped.startswith("*"):
                    break

                mode = stripped.removeprefix("*").strip()

                if mode:
                    modes.append(mode)

        return modes

    def _detect_wifi_standards(
        self,
        iw_output: str,
        capabilities: WifiCapabilities,
    ) -> None:
        """Detect Wi-Fi generations from iw PHY information."""

        capabilities.wifi_7 = "EHT" in iw_output
        capabilities.wifi_6 = "HE" in iw_output
        capabilities.wifi_5 = "VHT" in iw_output
        capabilities.wifi_4 = "HT" in iw_output

        # Wi-Fi 6E uses Wi-Fi 6 PHY capabilities
        # together with 6 GHz support. We will
        # populate this accurately once frequency
        # parsing is implemented.
        capabilities.wifi_6e = False

