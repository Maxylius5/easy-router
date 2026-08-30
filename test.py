from src.config.manager import ConfigManager
from src.config.validation import (
    ConfigValidationError,
    validate,
)


def main():
    manager = ConfigManager()

    config = manager.load()

    config.wireguard.enabled = True
    config.wireguard.listen_port = 99999

    print(config)

    try:
        validate(config)
    except ConfigValidationError as exc:
        print(f"Invalid configuration: {exc}")
        return

    manager.save(config)

    print("Configuration saved.")


if __name__ == "__main__":
    main()