import subprocess

class SystemdService:
    def restart(self, service_name: str) -> None:
        subprocess.run(
            ["systemctl", "restart", service_name],
            check=True,
        )

    def stop(self, service_name: str) -> None:
        subprocess.run(
            ["systemctl", "stop", service_name],
            check=True,
        )

    def start(self, service_name: str) -> None:
        subprocess.run(
            ["systemctl", "start", service_name],
            check=True,
        )

    def is_active(self, service_name: str) -> bool:
        result = subprocess.run(
            ["systemctl", "is-active", service_name],
            capture_output=True,
            text=True,
        )

        return result.returncode == 0