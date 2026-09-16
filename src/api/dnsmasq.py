
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config.manager import ConfigManager
from src.models.config import DnsmasqConfig
from src.services.dnsmasq import DnsmasqService

TAG="dnsmasq"

router = APIRouter(
    prefix=f"/api/{TAG}",
    tags=[TAG],
)


config_manager = ConfigManager()
dnsmasq = DnsmasqService()



class DnsmasqResponse(BaseModel):
    message: str


@router.get("", response_model=DnsmasqConfig) 
def get_dnsmasq_config() -> DnsmasqConfig:
    """ Return the dnsmasq configuration currently used by Easy Router. """ 

    config = config_manager.load_actual(TAG, DnsmasqConfig)
    
    return config.dnsmasq

@router.put("")
def update_dnsmasq(config: DnsmasqConfig):
    """
    Validate and apply a new dnsmasq configuration.
    """

    try:

        dnsmasq.validate_config(config)

        config_manager.save_desired(TAG, config)

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


    return DnsmasqResponse(
        message="Dnsmasq configuration applied"
    )
