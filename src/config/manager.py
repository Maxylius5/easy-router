import json
import os
from pathlib import Path
from typing import Any


class ConfigManager:
    def __init__(self):
        self.config_dir = self._default_path()
        self.desired_dir = self.config_dir / "desired"
        self.actual_dir = self.config_dir / "actual"

    @staticmethod
    def _default_path() -> Path:
        xdg_config_home = os.environ.get("XDG_CONFIG_HOME")

        if xdg_config_home:
            return Path(xdg_config_home) / "easy-router"

        return Path.home() / ".config" / "easy-router"

    def save_desired(self, service: str, config: Any) -> None:
        self._save(
            self.desired_dir / f"{service}.json",
            config,
        )

    def save_actual(self, service: str, config: Any) -> None:
        self._save(
            self.actual_dir / f"{service}.json",
            config,
        )

    def load_desired(self, service: str, model: type) -> Any:
        return self._load(
            self.desired_dir / f"{service}.json",
            model,
        )

    def load_actual(self, service: str, model: type) -> Any:
        return self._load(
            self.actual_dir / f"{service}.json",
            model,
        )

    @staticmethod
    def _save(path: Path, config: Any) -> None:
        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with path.open("w", encoding="utf-8") as file:
            json.dump(
                config.to_dict(),
                file,
                indent=4,
            )

    @staticmethod
    def _load(path: Path, model: type) -> Any:
        if not path.exists():
            return model()

        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        return model.from_dict(data)
