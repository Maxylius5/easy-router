
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.hostapd import HostapdService
from models.config import WifiConfig


router = APIRouter(
    prefix="/api/hostapd",
    tags=["hostapd"],
)


hostapd = HostapdService()


class HostapdResponse(BaseModel):
    message: str


@router.get("")
def get_hostapd_config():
    """
    Return the configuration currently used
    by Easy Router.
    """

    # For the first example, return a simple
    # configuration object.

    config = WifiConfig(
        interface="wlp4s0",
        ssid="EasyRouter",
        password="",
        country="NL",
        channel=6,
    )

    return config


@router.put("")
def update_hostapd(config: WifiConfig):
    """
    Validate and apply a new hostapd configuration.
    """

    try:

        hostapd.validate_config(config)

        hostapd.apply(config)

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


    return HostapdResponse(
        message="Hostapd configuration applied."
    )
