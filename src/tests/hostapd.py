from models.config import WifiConfig
from services.hostapd import HostapdService


def main():
    config = WifiConfig(
        enabled=True,
        interface="wlp4s0",
        ssid="EasyRouter",
        password="testpassword",
        country="NL",
        channel=6,
    )

    service = HostapdService()

    service.validate_config(config)

    generated = service.generate_config(config)

    print("Generated hostapd.conf:")
    print()
    print(generated)


if __name__ == "__main__":
    main()