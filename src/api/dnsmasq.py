
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config.manager import ConfigManager
from src.models.config import DnsmasqConfig
from src.services.dnsmasq import DnsmasqService


router = APIRouter(
    prefix="/api/dnsmasq",
    tags=["dnsmasq"],
)


config_manager = ConfigManager()
dnsmasq = DnsmasqService()


class DnsmasqResponse(BaseModel):
    message: str


@router.get("", response_model=DnsmasqConfig) 
def get_dnsmasq_config() -> DnsmasqConfig:
    """ Return the dnsmasq configuration currently used by Easy Router. """ 

    config = config_manager.load()
    
    return DnsmasqConfig(
        interface="br0", except_interfaces=["lo"], no_resolv=True, upstream_servers=[ "94.140.14.14@wgo_free", "94.140.15.15@wgo_free", "2a10:50c0::ad1:ff@wgo_free", "2a10:50c0::ad2:ff@wgo_free", ], cache_size=10000, negative_ttl=3600, dns_forward_max=150, stop_dns_rebind=True, rebind_localhost_ok=True, ipv6_ads=True, domain="home", expand_hosts=True, blocklist_files=[ "/etc/dnsmasq.blocklists/stevenblack.hosts", "/etc/dnsmasq.blocklists/swc.hosts", "/etc/dnsmasq.blocklists/oisd.hosts", ], log_queries=True, log_dhcp=False, log_destination="/var/log/dnsmasq.log", dhcp_config={ "enabled": True, "interface": "br0", "network": "192.168.50.0/24", "gateway": "192.168.50.1", "range_start": "192.168.50.10", "range_end": "192.168.50.100", "lease_time": "12h", "dns_servers": [ "192.168.50.1", ], "domain": "home", "authoritative": True, "ipv6_enabled": True, "ipv6_ra": True, "ipv6_range_start": "::100", "ipv6_range_end": "::1ff", "ipv6_prefix_length": 64, "ipv6_dns_servers": [ "fd50:abcd:1234:1::1", ], }, )


@router.put("")
def update_hostapd(config: DnsmasqConfig):
    """
    Validate and apply a new hostapd configuration.
    """

    try:

        dnsmasq.validate_config(config)

        dnsmasq.apply(config)

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


    return DnsmasqResponse(
        message="Hostapd configuration applied."
    )
