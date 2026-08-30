import json
import os
from pathlib import Path

from src.models.config import RouterConfig


class ConfigManager:
    def __init__(self, path: Path | None = None):
        self.path = path or self._default_path()

    @staticmethod
    def _default_path() -> Path:
        xdg_config_home = os.environ.get("XDG_CONFIG_HOME")

        if xdg_config_home:
            config_dir = Path(xdg_config_home)
        else:
            config_dir = Path.home() / ".config"

        return config_dir / "easy-router" / "config.json"

    def load(self) -> RouterConfig:
        if not self.path.exists():
            return RouterConfig()

        with self.path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        return RouterConfig.from_dict(data)

    def save(self, config: RouterConfig) -> None:
        self.path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with self.path.open("w", encoding="utf-8") as file:
            json.dump(
                config.to_dict(),
                file,
                indent=4,
            )