import subprocess
import tempfile
from pathlib import Path

from config.hostapd import HostapdConfig
from models.config import WifiConfig
from services.base import Service


class HostapdError(Exception):
    """Raised when hostapd configuration fails."""


class HostapdService(Service[WifiConfig]):
    CONFIG_PATH = Path("/etc/hostapd/easy-router.conf")
    """Manage hostapd configuration."""

    def generate_config(self, config: WifiConfig) -> str:
        lines = [
            f"interface={config.interface}",
            "driver=nl80211",
            f"ssid={config.ssid}",
            f"country_code={config.country}",
            "hw_mode=g",
            f"channel={config.channel}",
            "",
            "# General",
            "auth_algs=1",
            "wmm_enabled=1",
            "",
        ]

        if config.password:
            lines.extend(
                [
                    "# WPA2",
                    "wpa=2",
                    f"wpa_passphrase={config.password}",
                    "wpa_key_mgmt=WPA-PSK",
                    "rsn_pairwise=CCMP",
                ]
            )
        else:
            lines.extend(
                [
                    "# Open network",
                    "wpa=0",
                ]
            )

        return "\n".join(lines) + "\n"

    def validate_config(self, config: WifiConfig) -> None:
        if not config.interface:
            raise HostapdError(
                "No Wi-Fi interface configured."
            )

        if not config.ssid:
            raise HostapdError(
                "No SSID configured."
            )

        if len(config.ssid.encode("utf-8")) > 32:
            raise HostapdError(
                "SSID must be at most 32 bytes."
            )

        if config.password:
            password_length = len(
                config.password.encode("utf-8")
            )

            if not 8 <= password_length <= 63:
                raise HostapdError(
                    "WPA password must be between "
                    "8 and 63 bytes."
                )

        if not 1 <= config.channel <= 196:
            raise HostapdError(
                f"Invalid channel: {config.channel}"
            )

        if len(config.country) != 2:
            raise HostapdError(
                "Country code must contain exactly "
                "two characters."
            )

    def test_config(self, config: WifiConfig) -> None:
        self.validate_config(config)

        config_text = self.generate_config(config)

        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".conf",
            prefix="easy-router-hostapd-",
            delete=False,
            encoding="utf-8",
        ) as file:
            file.write(config_text)
            config_path = Path(file.name)

        try:
            result = subprocess.run(
                [
                    "hostapd",
                    "-t",
                    str(config_path),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                raise HostapdError(
                    result.stderr.strip()
                    or result.stdout.strip()
                    or "hostapd configuration test failed."
                )

        finally:
            config_path.unlink(missing_ok=True)

    def write_config(self, config: WifiConfig) -> None:
        config_text = self.generate_config(config)

        self.CONFIG_PATH.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.CONFIG_PATH.write_text(
            config_text,
            encoding="utf-8",
        )

    def apply(self, config: WifiConfig) -> None:
        raise NotImplementedError(
            "Applying hostapd configuration is not "
            "implemented yet."
        )