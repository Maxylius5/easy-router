from services.systemd import SystemdManager

from typing import Any

from config.manager import ConfigManager


class RouterManager:
    def __init__(
        self,
        systemd: SystemdManager,
        config_manager: ConfigManager,
    ):
        self.systemd = systemd
        self.config_manager = config_manager

    def apply(
        self,
        service_name: str,
        service: Any,
        config_model: type,
    ) -> bool:
        desired = self.config_manager.load_desired(
            service_name,
            config_model,
        )

        actual = self.config_manager.load_actual(
            service_name,
            config_model,
        )

        if desired == actual:
            return False

        service.validate_config(desired)
        service.test_config(desired)
        service.write_config(desired)
        self.systemd.restart(f"easy-router-{service_name}.service")

        self.config_manager.save_actual(
            service_name,
            desired,
        )

        return True

    def start(self) -> None:
        self.systemd.start("easy-router.target")

    def stop(self) -> None:
        self.systemd.stop("easy-router.target")

    def restart(self) -> None:
        self.systemd.restart("easy-router.target")

