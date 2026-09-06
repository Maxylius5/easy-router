import json
import os
from pathlib import Path

from src.models.config import RouterConfig


class ConfigManager:
    def __init__(self):
        self.desired_path, self.actual_path = self._default_path()

    @staticmethod
    def _default_path() -> tuple[Path, Path]:
        xdg_config_home = os.environ.get("XDG_CONFIG_HOME")

        if xdg_config_home:
            config_dir = Path(xdg_config_home)
        else:
            config_dir = Path.home() / ".config"
        
        desired_state = config_dir / "easy-router" / "desired_config.json"
        actual_state = config_dir / "easy-router" / "actual_config.json"
        return desired_state, actual_state

    def load_desired(self) -> RouterConfig:
        if not self.desired_path.exists():
            return RouterConfig()

        with self.desired_path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        return RouterConfig.from_dict(data)

    def save_desired(self, config: RouterConfig) -> None:
        self.desired_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with self.desired_path.open("w", encoding="utf-8") as file:
            json.dump(
                config.to_dict(),
                file,
                indent=4,
            )

    def load_actual(self) -> RouterConfig:
        if not self.actual_path.exists():
            return RouterConfig()

        with self.actual_path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        return RouterConfig.from_dict(data)

    def save_actual(self, config: RouterConfig) -> None:
        self.actual_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with self.actual_path.open("w", encoding="utf-8") as file:
            json.dump(
                config.to_dict(),
                file,
                indent=4,
            )