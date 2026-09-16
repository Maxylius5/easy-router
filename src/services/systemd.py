import subprocess



class SystemdManager:
    def daemon_reload(self) -> None:
        subprocess.run(
            ["systemctl", "daemon-reload"],
            check=True,
        )

    def enable(self, unit: str) -> None:
        subprocess.run(
            ["systemctl", "enable", unit],
            check=True,
        )

    def start(self, unit: str) -> None:
        subprocess.run(
            ["systemctl", "start", unit],
            check=True,
        )

    def stop(self, unit: str) -> None:
        subprocess.run(
            ["systemctl", "stop", unit],
            check=True,
        )

    def restart(self, unit: str) -> None:
        subprocess.run(
            ["systemctl", "restart", unit],
            check=True,
        )

    def is_active(self, unit: str) -> bool:
        result = subprocess.run(
            ["systemctl", "is-active", "--quiet", unit],
        )
        return result.returncode == 0