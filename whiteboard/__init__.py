"""
AI Whiteboard: a live, hand-drawn whiteboard that AIs draw on while you watch.

    from whiteboard import Whiteboard
    wb = Whiteboard(agent="my-bot")
    wb.draw({"type": "title", "text": "Hello!"})
"""

__version__ = "1.0.0"

from .client import Whiteboard, WhiteboardError  # noqa: E402,F401
