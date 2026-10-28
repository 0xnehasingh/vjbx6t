"""Small data classes shared by the backend modules."""
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Actual:
    """Real wind generation for one half-hour (FUELHH)."""

    start_time: datetime
    generation: float


@dataclass(frozen=True)
class Forecast:
    """One wind forecast for one hour (WINDFOR)."""

    start_time: datetime  # the hour being forecast
    publish_time: datetime  # when the forecast was published
    generation: float

    @property
    def horizon_hours(self) -> float:
        return (self.start_time - self.publish_time).total_seconds() / 3600
