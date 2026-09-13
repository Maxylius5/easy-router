import subprocess
import tempfile
from pathlib import Path

from models.config import WgConfig
from services.base import Service


class WireguardError(Exception):
    """Raised when WireGuard configuration fails."""


class WireguardService(Service[WgConfig]):
    CONFIG_PATH = Path("/etc/wireguard/easy-router.conf")
    """Manage hostapd configuration."""

    def generate_config(self, config: WgConfig) -> str:
        lines = [
            config.conf_file,
            f"Table={config.table}",
            f"MTU={config.mtu}",
            ""
        ]

        return "\n".join(lines) + "\n"

    def validate_config(self, config: WgConfig) -> None:
        if not config.conf_file:
            raise WireguardError(
                "No config file added"
            )


        if not 576 <= config.mtu <= 9000:
            raise WireguardError(
                f"Invalid MTU: {config.mtu}"
            )



    def test_config(self, config: WgConfig) -> None:
        self.validate_config(config)

        config_text = self.generate_config(config)

        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".conf",
            prefix="easy-router-wg-quick",
            delete=False,
            encoding="utf-8",
        ) as file:
            file.write(config_text)
            config_path = Path(file.name)

        try:
            result = subprocess.run(
                [
                    "wg-quick",
                    "-t",
                    str(config_path),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                raise WireguardError(
                    result.stderr.strip()
                    or result.stdout.strip()
                    or "wg-quick configuration test failed."
                )

        finally:
            config_path.unlink(missing_ok=True)

    def write_config(self, config: WgConfig) -> None:
        config_text = self.generate_config(config)

        self.CONFIG_PATH.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.CONFIG_PATH.write_text(
            config_text,
            encoding="utf-8",
        )

    def apply(self, config: WgConfig) -> None:
        raise NotImplementedError(
            "Applying hostapd configuration is not "
            "implemented yet."
        )