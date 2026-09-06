import ipaddress
import subprocess
import tempfile
from pathlib import Path

from models.config import DnsmasqConfig
from services.base import Service


class DnsmasqError(Exception):
    """Raised when dnsmasq configuration fails."""


class DnsmasqService(Service[DnsmasqConfig]):
    CONFIG_PATH = Path("/etc/dnsmasq.d/easy-router.conf")
    """Manage dnsmasq configuration."""

    def generate_config(self, config: DnsmasqConfig) -> str:
        self.validate_config(config)

        lines: list[str] = []

        # ------------------------------------------------------------------
        # Interfaces
        # ------------------------------------------------------------------

        if config.interface:
            lines.append(f"interface={config.interface}")

        for interface in config.except_interfaces:
            if interface:
                lines.append(f"except-interface={interface}")

        if config.interface:
            lines.append("bind-interfaces")

        # ------------------------------------------------------------------
        # DNS
        # ------------------------------------------------------------------

        lines.extend(
            [
                "",
                "# DNS",
            ]
        )

        if config.no_resolv:
            lines.append("no-resolv")

        for server in config.upstream_servers:
            lines.append(f"server={server}")

        # ------------------------------------------------------------------
        # DNS cache
        # ------------------------------------------------------------------

        lines.extend(
            [
                "",
                "# DNS cache",
                f"cache-size={config.cache_size}",
                f"neg-ttl={config.negative_ttl}",
                f"dns-forward-max={config.dns_forward_max}",
            ]
        )

        # ------------------------------------------------------------------
        # DNS security
        # ------------------------------------------------------------------

        lines.extend(
            [
                "",
                "# DNS security",
            ]
        )

        if config.stop_dns_rebind:
            lines.append("stop-dns-rebind")

        if config.rebind_localhost_ok:
            lines.append("rebind-localhost-ok")

        # ------------------------------------------------------------------
        # Local DNS
        # ------------------------------------------------------------------

        lines.extend(
            [
                "",
                "# Local DNS",
            ]
        )

        if config.domain:
            lines.append(f"domain={config.domain}")

            if config.expand_hosts:
                lines.append("expand-hosts")

            # Never forward the local domain upstream.
            lines.append(f"local=/{config.domain}/")

        # ------------------------------------------------------------------
        # Blocklists
        # ------------------------------------------------------------------

        if config.blocklist_files:
            lines.extend(
                [
                    "",
                    "# Blocklists",
                ]
            )

            for blocklist in config.blocklist_files:
                lines.append(f"addn-hosts={blocklist}")

        # ------------------------------------------------------------------
        # Logging
        # ------------------------------------------------------------------

        if config.log_queries or config.log_dhcp:
            lines.extend(
                [
                    "",
                    "# Logging",
                ]
            )

            if config.log_queries:
                lines.append("log-queries")

            if config.log_dhcp:
                lines.append("log-dhcp")

            if config.log_destination:
                lines.append(
                    f"log-facility={config.log_destination}"
                )

        # ------------------------------------------------------------------
        # DHCP
        # ------------------------------------------------------------------

        dhcp = config.dhcp_config

        if dhcp.enabled:
            lines.extend(
                [
                    "",
                    "# DHCP",
                ]
            )

            if dhcp.interface:
                lines.append(
                    f"dhcp-range="
                    f"{dhcp.range_start},"
                    f"{dhcp.range_end},"
                    f"{dhcp.lease_time}"
                )

            # Default gateway.
            if dhcp.gateway:
                lines.append(
                    f"dhcp-option=3,{dhcp.gateway}"
                )

            # DNS servers.
            if dhcp.dns_servers:
                dns_servers = ",".join(dhcp.dns_servers)

                lines.append(
                    f"dhcp-option=6,{dns_servers}"
                )

            # DHCP domain.
            if dhcp.domain:
                lines.append(
                    f"dhcp-option=15,{dhcp.domain}"
                )

            if dhcp.authoritative:
                lines.append("dhcp-authoritative")

            # ------------------------------------------------------------------
            # DHCPv6 / IPv6 Router Advertisements
            # ------------------------------------------------------------------

            if dhcp.ipv6_enabled or config.ipv6_ads:
                lines.extend(
                    [
                        "",
                        "# IPv6 / DHCPv6",
                    ]
                )

                if config.ipv6_ads:
                    lines.append("enable-ra")

                if dhcp.ipv6_enabled:
                    if not dhcp.interface:
                        raise DnsmasqError(
                            "DHCPv6 requires a DHCP interface."
                        )

                    lines.append(
                        "dhcp-range="
                        f"{dhcp.ipv6_range_start},"
                        f"{dhcp.ipv6_range_end},"
                        f"constructor:{dhcp.interface},"
                        f"ra-stateless,"
                        f"{dhcp.ipv6_prefix_length},"
                        f"{dhcp.lease_time}"
                    )

                    if dhcp.ipv6_dns_servers:
                        dns_servers = ",".join(
                            f"[{server}]"
                            for server in dhcp.ipv6_dns_servers
                        )

                        lines.append(
                            "dhcp-option="
                            f"option6:dns-server,"
                            f"{dns_servers}"
                        )

        return "\n".join(lines).rstrip() + "\n"

    def validate_config(self, config: DnsmasqConfig) -> None:
        """Validate the Python configuration before generating dnsmasq.conf."""

        # ------------------------------------------------------------------
        # General
        # ------------------------------------------------------------------

        if config.interface and not config.interface.strip():
            raise DnsmasqError(
                "Interface must not contain only whitespace."
            )

        for interface in config.except_interfaces:
            if not interface.strip():
                raise DnsmasqError(
                    "Excluded interface must not be empty."
                )

        # ------------------------------------------------------------------
        # DNS
        # ------------------------------------------------------------------

        if config.cache_size < 0:
            raise DnsmasqError(
                "DNS cache size cannot be negative."
            )

        if config.negative_ttl < 0:
            raise DnsmasqError(
                "Negative TTL cannot be negative."
            )

        if config.dns_forward_max <= 0:
            raise DnsmasqError(
                "dns-forward-max must be greater than zero."
            )

        if config.domain:
            domain = config.domain.strip()

            if not domain:
                raise DnsmasqError(
                    "DNS domain must not contain only whitespace."
                )

        # ------------------------------------------------------------------
        # Upstream DNS servers
        # ------------------------------------------------------------------

        for server in config.upstream_servers:
            self._validate_upstream_server(server)

        # ------------------------------------------------------------------
        # Blocklists
        # ------------------------------------------------------------------

        for blocklist in config.blocklist_files:
            if not blocklist.strip():
                raise DnsmasqError(
                    "Blocklist path must not be empty."
                )

        # ------------------------------------------------------------------
        # Logging
        # ------------------------------------------------------------------

        if (
            config.log_queries or config.log_dhcp
        ) and not config.log_destination:
            raise DnsmasqError(
                "A log destination is required when logging "
                "is enabled."
            )

        # ------------------------------------------------------------------
        # DHCP
        # ------------------------------------------------------------------

        dhcp = config.dhcp_config

        if not dhcp.enabled:
            return

        if not dhcp.interface:
            raise DnsmasqError(
                "DHCP is enabled but no interface is configured."
            )

        if not dhcp.interface.strip():
            raise DnsmasqError(
                "DHCP interface must not contain only whitespace."
            )

        self._validate_ipv4_network(
            dhcp.network,
            "DHCP network",
        )

        self._validate_ipv4_address(
            dhcp.gateway,
            "DHCP gateway",
        )

        range_start = self._validate_ipv4_address(
            dhcp.range_start,
            "DHCP range start",
        )

        range_end = self._validate_ipv4_address(
            dhcp.range_end,
            "DHCP range end",
        )

        if int(range_start) > int(range_end):
            raise DnsmasqError(
                "DHCP range_start must not be greater "
                "than range_end."
            )

        network = ipaddress.ip_network(
            dhcp.network,
            strict=False,
        )

        if (
            range_start not in network
            or range_end not in network
        ):
            raise DnsmasqError(
                "DHCP address range must be inside "
                "the configured DHCP network."
            )

        self._validate_ipv4_addresses(
            dhcp.dns_servers,
            "DHCP DNS server",
        )

        if dhcp.ipv6_enabled:
            if not dhcp.interface:
                raise DnsmasqError(
                    "DHCPv6 requires an interface."
                )

            if not 0 <= dhcp.ipv6_prefix_length <= 128:
                raise DnsmasqError(
                    "IPv6 prefix length must be between "
                    "0 and 128."
                )

            self._validate_ipv6_address(
                dhcp.ipv6_range_start,
                "DHCPv6 range start",
            )

            self._validate_ipv6_address(
                dhcp.ipv6_range_end,
                "DHCPv6 range end",
            )

            for server in dhcp.ipv6_dns_servers:
                self._validate_ipv6_address(
                    server,
                    "DHCPv6 DNS server",
                )

    def test_config(self, config: DnsmasqConfig) -> None:
        """
        Generate a temporary dnsmasq.conf and ask dnsmasq
        to validate it.
        """

        self.validate_config(config)

        config_text = self.generate_config(config)

        config_path: Path | None = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".conf",
                prefix="easy-router-dnsmasq-",
                delete=False,
                encoding="utf-8",
            ) as file:
                file.write(config_text)
                config_path = Path(file.name)

            result = subprocess.run(
                [
                    "dnsmasq",
                    "--test",
                    f"--conf-file={config_path}",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                message = (
                    result.stderr.strip()
                    or result.stdout.strip()
                    or "dnsmasq configuration test failed."
                )

                raise DnsmasqError(message)

        except FileNotFoundError as exc:
            raise DnsmasqError(
                "dnsmasq executable was not found."
            ) from exc

        finally:
            if config_path is not None:
                config_path.unlink(missing_ok=True)

    def write_config(self, config: DnsmasqConfig) -> None:
        config_text = self.generate_config(config)

        self.CONFIG_PATH.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.CONFIG_PATH.write_text(
            config_text,
            encoding="utf-8",
        )



    def apply(self, config: DnsmasqConfig) -> None:
        """
        Apply dnsmasq configuration.

        Not implemented yet.
        """

        raise NotImplementedError(
            "Applying dnsmasq configuration is not "
            "implemented yet."
        )

    @staticmethod
    def _validate_ipv4_address(
        value: str,
        name: str,
    ) -> ipaddress.IPv4Address:
        try:
            address = ipaddress.ip_address(value)

            if not isinstance(
                address,
                ipaddress.IPv4Address,
            ):
                raise ValueError

            return address

        except ValueError as exc:
            raise DnsmasqError(
                f"{name} must be a valid IPv4 address: {value!r}"
            ) from exc

    @staticmethod
    def _validate_ipv4_addresses(
        values: list[str],
        name: str,
    ) -> None:
        for value in values:
            DnsmasqService._validate_ipv4_address(
                value,
                name,
            )

    @staticmethod
    def _validate_ipv6_address(
        value: str,
        name: str,
    ) -> ipaddress.IPv6Address:
        try:
            address = ipaddress.ip_address(value)

            if not isinstance(
                address,
                ipaddress.IPv6Address,
            ):
                raise ValueError

            return address

        except ValueError as exc:
            raise DnsmasqError(
                f"{name} must be a valid IPv6 address: {value!r}"
            ) from exc

    @staticmethod
    def _validate_ipv4_network(
        value: str,
        name: str,
    ) -> ipaddress.IPv4Network:
        try:
            network = ipaddress.ip_network(
                value,
                strict=False,
            )

            if not isinstance(
                network,
                ipaddress.IPv4Network,
            ):
                raise ValueError

            return network

        except ValueError as exc:
            raise DnsmasqError(
                f"{name} must be a valid IPv4 network: {value!r}"
            ) from exc

    @staticmethod
    def _validate_upstream_server(
        value: str,
    ) -> None:
        """
        Validate dnsmasq's:

            server=IP
            server=IP@interface

        syntax.

        We intentionally don't try to fully validate interface names,
        because Linux interface naming rules are platform dependent.
        """

        if not value.strip():
            raise DnsmasqError(
                "Upstream DNS server cannot be empty."
            )

        server = value.strip()

        if "@" in server:
            address, interface = server.rsplit("@", 1)

            if not interface.strip():
                raise DnsmasqError(
                    f"Invalid upstream DNS server: {value!r}"
                )
        else:
            address = server

        # Strip dnsmasq's IPv6 bracket notation if supplied.
        address = address.strip("[]")

        # DNS servers may optionally specify a port:
        #
        #   1.1.1.1#53
        #   [2606:4700:4700::1111]#53
        #
        if "#" in address:
            address, port = address.rsplit("#", 1)

            if not port.isdigit():
                raise DnsmasqError(
                    f"Invalid DNS port in: {value!r}"
                )

            port_number = int(port)

            if not 1 <= port_number <= 65535:
                raise DnsmasqError(
                    f"Invalid DNS port in: {value!r}"
                )

        try:
            ipaddress.ip_address(address)
        except ValueError as exc:
            raise DnsmasqError(
                f"Invalid upstream DNS server: {value!r}"
            ) from exc