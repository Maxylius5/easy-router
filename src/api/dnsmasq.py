
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
    
    return config.dnsmasq

@router.put("")
def update_hostapd(config: DnsmasqConfig):
    """
    Validate and apply a new hostapd configuration.
    """

    try:

        dnsmasq.validate_config(config)
        #dnsmasq.apply(config)

        router_config = config_manager.load()
        router_config.dnsmasq = config
        config_manager.save(router_config)

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


    return DnsmasqResponse(
        message="Dnsmasq configuration applied"
    )
