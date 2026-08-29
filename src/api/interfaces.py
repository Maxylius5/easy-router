from fastapi import APIRouter

from inventory.scanner import Scanner


router = APIRouter(prefix="/api")

scanner = Scanner()


@router.get("/interfaces")
def get_interfaces():
    return scanner.discover()

