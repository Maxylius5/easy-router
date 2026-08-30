from abc import ABC, abstractmethod
from typing import Generic, TypeVar


ConfigType = TypeVar("ConfigType")


class Service(ABC, Generic[ConfigType]):
    """Base class for Linux service integrations."""

    @abstractmethod
    def generate_config(self, config: ConfigType) -> str:
        """Generate the service configuration."""
        raise NotImplementedError

    @abstractmethod
    def validate_config(self, config: ConfigType) -> None:
        """Validate the generated configuration."""
        raise NotImplementedError

    @abstractmethod
    def apply(self, config: ConfigType) -> None:
        """Apply the configuration to the running system."""
        raise NotImplementedError