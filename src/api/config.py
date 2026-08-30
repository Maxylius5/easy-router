from fastapi import APIRouter

from src.config.manager import ConfigManager
from src.models.config import RouterConfig


router = APIRouter(
    prefix="/api",
    tags=["config"],
)


config_manager = ConfigManager()


@router.get(
    "/config",
    response_model=RouterConfig,
)
def get_config() -> RouterConfig:
    """Return the current Easy Router configuration."""

    return config_manager.load()


@router.put(
    "/config",
    response_model=RouterConfig,
)
def update_config(
    config: RouterConfig,
) -> RouterConfig:
    """Save the Easy Router configuration."""

    config_manager.save(config)

    return config