from pathlib import Path
import shutil

SYSTEMD_DIR = Path("/etc/systemd/system")


class EasyRouterSystemdInitializer:
    """Installs Easy Router systemd unit files."""



    @property
    def units_dir(self) -> Path:
        # systemd.py -> services -> src -> project root -> units
        return Path(__file__).resolve().parents[2] / "units"

    def install(self) -> None:
        self._validate_units_directory()
        self._ensure_systemd_directory()
        self._copy_units()

    def _validate_units_directory(self) -> None:
        if not self.units_dir.exists():
            raise FileNotFoundError(
                f"Systemd units directory does not exist: {self.units_dir}"
            )

        if not self.units_dir.is_dir():
            raise NotADirectoryError(
                f"Systemd units path is not a directory: {self.units_dir}"
            )

    def _ensure_systemd_directory(self) -> None:
        SYSTEMD_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

    def _copy_units(self) -> None:
        for source in self.units_dir.iterdir():
            if not source.is_file():
                continue

            destination = SYSTEMD_DIR / source.name
            shutil.copy2(source, destination)