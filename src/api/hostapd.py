from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.config.manager import ConfigManager
from src.models.config import WifiConfig
from src.services.hostapd import HostapdService


router = APIRouter(
    prefix="/api/hostapd",
    tags=["hostapd"],
)


config_manager = ConfigManager()
hostapd = HostapdService()


class HostapdResponse(BaseModel):
    message: str


@router.get(
    "",
    response_model=WifiConfig,
)
def get_hostapd_config() -> WifiConfig:
    """Return the current Hostapd configuration."""

    config = config_manager.load_actual()

    return config.wifi


@router.put(
    "",
    response_model=HostapdResponse,
)
def update_hostapd(
    config: WifiConfig,
) -> HostapdResponse:
    """Validate, apply and save the Hostapd configuration."""

    try:
        hostapd.validate_config(config)
        hostapd.apply(config)

        router_config = config_manager.load_desired()
        router_config.wifi = config
        config_manager.save_desired(router_config)

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return HostapdResponse(
        message="Hostapd configuration applied."
    )