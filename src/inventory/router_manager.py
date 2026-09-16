from services.systemd import SystemdManager

class RouterManager:
    def __init__(self, systemd: SystemdManager):
        self.systemd = systemd

    def start(self) -> None:
        self.systemd.start("easy-router.target")

    def stop(self) -> None:
        self.systemd.stop("easy-router.target")

    def restart(self) -> None:
        self.systemd.restart("easy-router.target")