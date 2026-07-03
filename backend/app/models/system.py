from typing import Literal

from pydantic import BaseModel


class SystemActionResponse(BaseModel):
    accepted: bool
    action: Literal["reboot", "shutdown", "restart"]
    message: str
