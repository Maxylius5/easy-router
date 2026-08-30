from fastapi import APIRouter, HTTPException

from src.inventory.scanner import Scanner
from src.models.network import NetworkInterface


router = APIRouter(
    prefix="/api",
    tags=["interfaces"],
)

scanner = Scanner()


@router.get(
    "/interfaces",
    response_model=list[NetworkInterface],
)
def get_interfaces() -> list[NetworkInterface]:
    """Return all discovered network interfaces."""

    return scanner.discover()


@router.get(
    "/interfaces/{name}",
    response_model=NetworkInterface,
)
def get_interface(
    name: str,
) -> NetworkInterface:
    """Return details for a single network interface."""

    interfaces = scanner.discover()

    for interface in interfaces:
        if interface.name == name:
            return interface

    raise HTTPException(
        status_code=404,
        detail=f"Interface '{name}' not found",
    )
