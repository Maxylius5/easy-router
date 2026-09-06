from typing import Any

from pydantic import BaseModel, Field


class WifiConfig(BaseModel):
    enabled: bool = False
    interface: str = ""
    ssid: str = ""
    password: str = ""

    country: str = "NL"
    channel: int = 6

class DhcpConfig(BaseModel):
    """
    DHCP server configuration.

    Used by dnsmasq for DHCPv4 and, where enabled, DHCPv6/RA.
    """

    enabled: bool = False
    interface: str = ""

    # IPv4 network
    network: str = "192.168.10.0/24"
    gateway: str = "192.168.10.1"

    # DHCPv4 address pool
    range_start: str = "192.168.10.100"
    range_end: str = "192.168.10.200"
    lease_time: str = "12h"

    # DHCP options
    dns_servers: list[str] = Field(
        default_factory=lambda: ["192.168.10.1"]
    )

    domain: str = "home"

    # DHCP server behavior
    authoritative: bool = True

    # IPv6 DHCP / Router Advertisements
    ipv6_enabled: bool = False
    ipv6_ra: bool = False

    # IPv6 address range, if DHCPv6 is enabled
    ipv6_range_start: str = "::100"
    ipv6_range_end: str = "::1ff"
    ipv6_prefix_length: int = 64

    # IPv6 DNS servers advertised to clients
    ipv6_dns_servers: list[str] = Field(
        default_factory=list
    )

class DnsmasqConfig(BaseModel):
    """
    dnsmasq service configuration.

    Controls DNS forwarding, local DNS, blocklists and logging.
    """

    # Interfaces
    interface: str = ""
    except_interfaces: list[str] = Field(
        default_factory=lambda: ["lo"]
    )

    # DNS
    enabled: bool = True
    no_resolv: bool = True

    # Upstream DNS servers.
    #
    # Example:
    #   94.140.14.14@wgo_free
    #   94.140.15.15@wgo_free
    #
    upstream_servers: list[str] = Field(
        default_factory=list
    )

    # DNS cache
    cache_size: int = 10000
    negative_ttl: int = 3600
    dns_forward_max: int = 150

    # DNS security
    stop_dns_rebind: bool = True
    rebind_localhost_ok: bool = True

    # IPv6
    ipv6_ads: bool = False

    # Local DNS domain
    domain: str = "home"
    expand_hosts: bool = True

    # Blocklists
    blocklist_files: list[str] = Field(
        default_factory=list
    )

    # Logging
    log_queries: bool = False
    log_dhcp: bool = False
    log_destination: str = "/var/log/dnsmasq.log"

    # DHCP configuration
    dhcp_config: DhcpConfig = Field(
        default_factory=DhcpConfig
    )



class WireGuardConfig(BaseModel):
    enabled: bool = False
    interface: str = "wg0"

    address: str = "10.0.0.1/24"
    listen_port: int = 51820


class RouterConfig(BaseModel):
    wifi: WifiConfig = Field(default_factory=WifiConfig)
    dhcp: DhcpConfig = Field(default_factory=DhcpConfig)
    wireguard: WireGuardConfig = Field(
        default_factory=WireGuardConfig
    )

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "RouterConfig":
        return cls.model_validate(data)