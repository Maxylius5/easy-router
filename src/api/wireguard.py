from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config.manager import ConfigManager
from src.models.config import WgConfig
from src.services.wireguard import WireguardService


TAG="wireguard"


router = APIRouter(
    prefix=f"/api/{TAG}",
    tags=[TAG],
)


config_manager = ConfigManager()
wireguard = WireguardService()




class WireguardError(Exception):
    pass

class WireguardResponse(BaseModel):
    message: str


@router.get(
    "",
    response_model=WgConfig,
)
def get_hostapd_config() -> WgConfig:
    """Return the current Wireguard configuration."""

    config = config_manager.load_actual(TAG, WgConfig)

    return WgConfig(
        installed=config.wireguard.installed,
        interface=config.wireguard.interface,
        mtu=config.wireguard.mtu,
        table=config.wireguard.table,
    )


@router.put(
    "",
    response_model=WireguardResponse,
)
def update_hostapd(
    config: WgConfig,
) -> WireguardResponse:
    """Validate, apply and save the Wireguard configuration."""

    try:
        wireguard.validate_config(config)

        config_manager.save_desired(TAG, config)

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return WireguardResponse(
        message="Hostapd configuration applied."
    )