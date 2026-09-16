from abc import ABC, abstractmethod
from typing import Generic, TypeVar


ConfigType = TypeVar("ConfigType")


class Service(ABC, Generic[ConfigType]):
    """Configuration integration for a Linux service."""

    @abstractmethod
    def generate_config(self, config: ConfigType) -> str:
        """Generate the native service configuration."""
        raise NotImplementedError

    @abstractmethod
    def validate_config(self, config: ConfigType) -> None:
        """Validate the configuration before it is applied."""
        raise NotImplementedError