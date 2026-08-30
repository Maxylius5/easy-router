import ipaddress

from src.models.config import RouterConfig


class ConfigValidationError(Exception):
    """Raised when the router configuration is invalid."""


def validate(config: RouterConfig) -> None:
    _validate_wifi(config)
    _validate_dhcp(config)
    _validate_wireguard(config)


def _validate_wifi(config: RouterConfig) -> None:
    wifi = config.wifi

    if not wifi.enabled:
        return

    if not wifi.interface:
        raise ConfigValidationError(
            "Wi-Fi is enabled but no interface is configured."
        )

    if not wifi.ssid:
        raise ConfigValidationError(
            "Wi-Fi is enabled but no SSID is configured."
        )

    if not 1 <= wifi.channel <= 196:
        raise ConfigValidationError(
            f"Invalid Wi-Fi channel: {wifi.channel}"
        )

    if wifi.password and len(wifi.password) < 8:
        raise ConfigValidationError(
            "Wi-Fi password must be at least 8 characters."
        )


def _validate_dhcp(config: RouterConfig) -> None:
    dhcp = config.dhcp

    if not dhcp.enabled:
        return

    if not dhcp.interface:
        raise ConfigValidationError(
            "DHCP is enabled but no interface is configured."
        )

    try:
        network = ipaddress.ip_network(
            dhcp.network,
            strict=False,
        )
    except ValueError as exc:
        raise ConfigValidationError(
            f"Invalid DHCP network: {dhcp.network}"
        ) from exc

    try:
        gateway = ipaddress.ip_address(dhcp.gateway)
    except ValueError as exc:
        raise ConfigValidationError(
            f"Invalid DHCP gateway: {dhcp.gateway}"
        ) from exc

    if gateway not in network:
        raise ConfigValidationError(
            "DHCP gateway is not inside the configured network."
        )

    try:
        range_start = ipaddress.ip_address(
            dhcp.range_start
        )
        range_end = ipaddress.ip_address(
            dhcp.range_end
        )
    except ValueError as exc:
        raise ConfigValidationError(
            "Invalid DHCP address range."
        ) from exc

    if range_start > range_end:
        raise ConfigValidationError(
            "DHCP range start must not be greater than range end."
        )

    if range_start not in network:
        raise ConfigValidationError(
            "DHCP range start is outside the configured network."
        )

    if range_end not in network:
        raise ConfigValidationError(
            "DHCP range end is outside the configured network."
        )


def _validate_wireguard(config: RouterConfig) -> None:
    wg = config.wireguard

    if not wg.enabled:
        return

    if not wg.interface:
        raise ConfigValidationError(
            "WireGuard is enabled but no interface is configured."
        )

    if not 1 <= wg.listen_port <= 65535:
        raise ConfigValidationError(
            f"Invalid WireGuard listen port: {wg.listen_port}"
        )

    try:
        ipaddress.ip_interface(wg.address)
    except ValueError as exc:
        raise ConfigValidationError(
            f"Invalid WireGuard address: {wg.address}"
        ) from exc