from abc import ABC, abstractmethod


class Service(ABC):

    @abstractmethod
    def validate(self, config):
        pass

    @abstractmethod
    def generate_config(self, config):
        pass

    @abstractmethod
    def apply(self, config):
        pass

    @abstractmethod
    def status(self):
        pass