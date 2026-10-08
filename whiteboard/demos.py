"""
Demo boards: `python -m whiteboard demo <name>`.

Each demo is a list of ops for `run_ops` (plain elements are drawn in
batches; {"op": ...} entries clear the board, talk, point and so on). They
double as worked examples of the drawing API for anyone writing an AI client.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List

from .reference import icon_names

Ops = List[Dict[str, Any]]


def plans() -> Ops:
    """The concept board: plans, goals and a robot that is ready to go."""
    return [
        {"op": "clear", "background": "whiteboard"},
        {"op": "settings", "mascot": True},
        {"type": "title", "id": "title", "y": 18, "size": 76, "underline": "green",
         "text": [{"text": "Our Plans ", "color": "blue"}, {"text": "& Goals!", "color": "navy"}]},
        {"type": "icon", "name": "lightbulb", "x": 150, "y": 14, "size": 115},
        {"type": "icon", "name": "trend", "x": 1290, "y": 30, "size": 150, "color": "blue"},

        {"type": "sticky", "id": "tasks", "x": 80, "y": 190, "w": 360, "color": "yellow", "rotate": -1.5,
         "title": "Today's Tasks", "bullets": "number", "size": 31,
         "items": ["Research Topic", "Draft Report", "Review together!"]},
        {"type": "icon", "name": "check", "x": 400, "y": 200, "size": 84},
        {"type": "icon", "name": "clipboard", "x": 125, "y": 500, "size": 118, "rotate": -9},

        {"type": "icon", "id": "schedule_icon", "name": "calendar", "x": 545, "y": 165, "size": 96},
        {"type": "text", "id": "schedule", "x": 652, "y": 192, "text": "Schedule", "size": 38, "bold": True,
         "color": "brown", "underline": "brown"},
        {"type": "arrow", "from": [812, 240], "to": [905, 214], "curve": -0.45, "color": "teal", "width": 5},

        {"type": "panel", "id": "goals", "x": 920, "y": 195, "w": 420, "color": "purple", "size": 31,
         "title": "Long-Term Goals", "items": ["Learn New Skills", "Start a Podcast", "Build a Website"]},
        {"type": "icon", "name": "rocket", "x": 1365, "y": 215, "size": 150, "rotate": 32},

        {"type": "panel", "id": "ideas", "x": 520, "y": 365, "w": 390, "h": 245, "color": "green",
         "style": "cloud", "title": "Project Ideas", "size": 30},
        {"type": "bubble", "x": 540, "y": 430, "w": 150, "h": 100, "kind": "thought", "text": "??",
         "size": 46, "bold": True, "color": "black", "text_color": "green", "tail": [688, 548]},
        {"type": "icon", "name": "network", "x": 735, "y": 432, "size": 110},
        {"type": "icon", "name": "lightbulb", "x": 688, "y": 448, "size": 40},
        {"type": "text", "x": 715, "y": 552, "align": "center", "text": "Brainstorm & Create!", "size": 30},

        {"type": "panel", "id": "habits", "x": 105, "y": 640, "w": 445, "color": "green", "size": 31,
         "title": "Healthy Habits", "items": ["Exercise More", "Eat Well", "Relax & Recharge"]},
        {"type": "icon", "name": "dumbbell", "x": 425, "y": 690, "size": 78},
        {"type": "icon", "name": "apple", "x": 440, "y": 760, "size": 62},
        {"type": "icon", "name": "lotus", "x": 438, "y": 818, "size": 70},

        {"type": "icon", "id": "target", "name": "target", "x": 665, "y": 640, "size": 135},
        {"type": "banner", "id": "achieve", "x": 575, "y": 790, "text": "Achieve Our Goals!", "size": 31,
         "color": "blue"},

        {"type": "panel", "id": "fun", "x": 935, "y": 505, "w": 330, "color": "red", "size": 31,
         "title": "Fun Activities", "items": ["Movie Night", "Go Hiking", "Game Time!"]},
        {"type": "bubble", "x": 1285, "y": 560, "w": 190, "h": 120, "text": "Let's do this!", "size": 31,
         "bold": True, "tail": [1425, 755]},

        {"type": "banner", "id": "teamwork", "x": 560, "y": 885, "text": "Teamwork! ❤", "size": 40,
         "color": "blue"},

        {"type": "arrow", "from": "tasks", "to": "ideas", "head": "none", "color": "gray", "width": 2.5},
        {"type": "arrow", "from": "habits", "to": "target", "head": "none", "color": "gray", "width": 2.5},
        {"type": "arrow", "from": "goals", "to": "fun", "head": "none", "color": "gray", "width": 2.5},
        {"type": "arrow", "from": "ideas", "to": "target", "head": "none", "color": "gray", "width": 2.5},
        {"op": "say", "text": "Let's do this! Pick a goal and we'll plan it together."},
    ]


def explain() -> Ops:
    """How the whiteboard itself works, drawn on the board."""
    code = (
        '{"type": "panel",\n'
        ' "title": "Long-Term Goals",\n'
        ' "items": ["Learn new skills",\n'
        '           "Start a podcast"],\n'
        ' "color": "purple"}'
    )
    return [
        {"op": "clear", "background": "grid"},
        {"op": "settings", "mascot": True},
        {"type": "title", "text": "How the AI Whiteboard works", "size": 62, "y": 20},

        {"type": "icon", "name": "robot", "x": 150, "y": 140, "size": 120},
        {"type": "panel", "id": "ai", "x": 60, "y": 280, "w": 330, "style": "card", "color": "purple",
         "title": "Any AI", "size": 25, "bullets": "arrow",
         "items": ["Claude Code (MCP tools)", "Claude Desktop (MCP)", "Scripts & bots (HTTP)", "You, with the markers"]},

        {"type": "icon", "name": "server", "x": 735, "y": 140, "size": 120},
        {"type": "panel", "id": "server", "x": 620, "y": 280, "w": 350, "style": "card", "color": "blue",
         "title": "Whiteboard server", "size": 25, "bullets": "check",
         "items": ["Checks & places elements", "Keeps undo + saves", "Streams every change", "Brokers snapshots"]},

        {"type": "icon", "name": "website", "x": 1285, "y": 140, "size": 120},
        {"type": "panel", "id": "browser", "x": 1180, "y": 280, "w": 360, "style": "card", "color": "green",
         "title": "Your browser", "size": 25, "bullets": "star",
         "items": ["Draws like a real marker", "Measures true sizes", "Renders pictures for the AI"]},

        {"type": "arrow", "from": {"id": "ai", "side": "right"}, "to": {"id": "server", "side": "left"},
         "label": "draw · say · look", "color": "purple", "width": 4},
        {"type": "arrow", "from": {"id": "server", "side": "right"}, "to": {"id": "browser", "side": "left"},
         "label": "live events", "color": "blue", "width": 4},
        {"type": "arrow", "from": {"id": "browser", "side": "bottom"}, "to": {"id": "server", "side": "bottom"},
         "route": "curve", "curve": -0.35, "label": "real sizes + snapshots", "color": "green", "width": 3.5},
        {"type": "arrow", "from": {"id": "server", "side": "bottom"}, "to": {"id": "ai", "side": "bottom"},
         "route": "curve", "curve": -0.35, "label": "ids, bboxes, images", "color": "orange", "width": 3.5},

        {"type": "code", "id": "example", "x": 60, "y": 700, "title": "one draw call", "text": code,
         "language": "json", "size": 19},
        {"type": "sticky", "x": 520, "y": 720, "w": 290, "color": "pink", "rotate": 2,
         "title": "Tip", "text": "Call **look** after drawing to see the board exactly as you do."},
        {"type": "flow", "x": 870, "y": 790, "steps": ["Draw", "Look", "Fix", "Explain"], "colorful": True,
         "size": 24, "gap": 46},
        {"op": "point", "id": "server", "label": "the hub"},
        {"op": "say", "text": "That's how I can show you things!"},
    ]


def showcase() -> Ops:
    """A tour of the element types."""
    return [
        {"op": "clear", "background": "whiteboard"},
        {"op": "settings", "mascot": True},
        {"type": "title", "text": "Everything I can draw", "size": 58, "y": 14, "underline": "orange"},

        {"type": "chart", "kind": "bar", "x": 40, "y": 110, "w": 470, "h": 300, "title": "Coffee this week",
         "data": [{"label": "Mon", "value": 3}, {"label": "Tue", "value": 5}, {"label": "Wed", "value": 2},
                  {"label": "Thu", "value": 6}, {"label": "Fri", "value": 4}], "unit": " cups"},
        {"type": "chart", "kind": "donut", "x": 545, "y": 110, "w": 460, "h": 300, "title": "Where the day goes",
         "data": [{"label": "Code", "value": 45}, {"label": "Meetings", "value": 20},
                  {"label": "Email", "value": 15}, {"label": "Coffee", "value": 20}]},
        {"type": "table", "x": 1050, "y": 130, "size": 21, "header_color": "teal",
         "rows": [["Feature", "Status", "Owner"], ["Login", "Done", "Ana"], ["Search", "70%", "Ben"],
                  ["Billing", "Planned", "Cy"]]},

        {"type": "timeline", "x": 40, "y": 450, "w": 960, "color": "purple",
         "items": [{"label": "Jan", "text": "Kickoff"}, {"label": "Mar", "text": "Prototype"},
                   {"label": "Jun", "text": "Beta"}, {"label": "Sep", "text": "Launch!", "color": "red"}]},
        {"type": "chart", "kind": "line", "x": 1050, "y": 380, "w": 500, "h": 250, "title": "Visitors",
         "labels": ["W1", "W2", "W3", "W4", "W5"],
         "series": [{"name": "2025", "values": [120, 180, 160, 240, 300], "color": "blue"},
                    {"name": "2026", "values": [200, 260, 310, 330, 420], "color": "orange"}]},

        {"type": "flow", "x": 40, "y": 660, "steps": ["Idea", "Sketch", {"text": "Good?", "shape": "diamond"}, "Ship"],
         "color": "blue", "size": 24, "gap": 50},
        {"type": "rect", "x": 40, "y": 830, "w": 130, "h": 80, "label": "rect", "color": "blue", "fill": "blue",
         "radius": 10},
        {"type": "ellipse", "x": 190, "y": 830, "w": 130, "h": 80, "label": "ellipse", "color": "green",
         "fill": "green"},
        {"type": "diamond", "x": 340, "y": 820, "w": 130, "h": 100, "label": "diamond", "color": "orange",
         "fill": "orange", "label_size": 20},
        {"type": "hexagon", "x": 490, "y": 830, "w": 130, "h": 80, "label": "hexagon", "color": "purple",
         "fill": "purple", "fill_style": "hachure"},
        {"type": "cloud", "x": 640, "y": 815, "w": 150, "h": 110, "label": "cloud", "color": "teal",
         "fill": "teal"},
        {"type": "cylinder", "x": 810, "y": 815, "w": 110, "h": 110, "label": "data", "color": "red",
         "fill": "red"},
        {"type": "star", "x": 940, "y": 815, "w": 110, "h": 110, "color": "yellow", "fill": "yellow",
         "fill_style": "solid"},

        {"type": "code", "x": 1080, "y": 680, "title": "hello.py", "language": "python", "size": 18,
         "text": "def greet(name):\n    # say hi on the board\n    return f\"Hello, {name}!\""},
        {"type": "sticky", "x": 1110, "y": 830, "w": 210, "color": "blue", "rotate": -3, "size": 24,
         "text": "Sticky notes too!"},
        {"type": "emoji", "text": "🎉", "x": 1340, "y": 870, "size": 56},
        {"op": "say", "text": "Charts, tables, flows, shapes, code... ask me for any of it!"},
    ]


def brainstorm() -> Ops:
    """A mind map with notes around it."""
    return [
        {"op": "clear", "background": "dots"},
        {"op": "settings", "mascot": True},
        {"type": "title", "text": "Podcast brainstorm", "size": 58, "y": 16, "color": "purple",
         "underline": "pink"},
        {"type": "mindmap", "cx": 760, "cy": 540, "center": "Our Podcast", "radius": 250, "size": 24,
         "branches": [
             {"text": "Topics", "children": ["AI tools", "Side projects", "Retro games"]},
             {"text": "Guests", "children": ["Friends", "Makers", "Listeners"]},
             {"text": "Format", "children": ["30 min", "Weekly", "Video too?"]},
             {"text": "Gear", "children": ["Mics", "Editing", "Hosting"]},
             {"text": "Name", "children": ["Byte Size", "Side Quest"]},
         ]},
        {"type": "sticky", "x": 40, "y": 140, "w": 230, "color": "yellow", "title": "First step",
         "text": "Record a 10 minute test episode"},
        {"type": "sticky", "x": 1300, "y": 150, "w": 240, "color": "green", "title": "Budget",
         "items": ["Mics: $120", "Hosting: free"], "bullets": "dash"},
        {"type": "icon", "name": "podcast", "x": 60, "y": 760, "size": 120},
        {"op": "say", "text": "Which branch should we grow first?"},
    ]


def lesson() -> Ops:
    """A chalkboard maths lesson."""
    a, b, c = (250, 470), (250, 650), (490, 650)  # right angle at b
    return [
        {"op": "clear", "background": "chalkboard"},
        {"op": "settings", "mascot": True},
        {"type": "title", "text": "Pythagoras in one picture", "size": 60, "y": 20, "color": "white",
         "underline": "yellow"},
        {"type": "line", "id": "sq_a", "points": [a, b, [70, 650], [70, 470]], "closed": True, "color": "teal",
         "fill": "teal", "fill_style": "hachure", "width": 3},
        {"type": "line", "id": "sq_b", "points": [b, c, [490, 890], [250, 890]], "closed": True,
         "color": "orange", "fill": "orange", "fill_style": "hachure", "width": 3},
        {"type": "line", "id": "sq_c", "points": [a, c, [670, 410], [430, 230]], "closed": True, "color": "pink",
         "fill": "pink", "fill_style": "hachure", "width": 3},
        {"type": "line", "id": "tri", "points": [a, b, c], "closed": True, "color": "white", "width": 5},
        {"type": "line", "points": [[250, 625], [275, 625], [275, 650]], "color": "white", "width": 3},
        {"type": "text", "x": 160, "y": 540, "text": "a²", "size": 44, "bold": True, "align": "center",
         "color": "teal"},
        {"type": "text", "x": 370, "y": 745, "text": "b²", "size": 44, "bold": True, "align": "center",
         "color": "orange"},
        {"type": "text", "x": 460, "y": 400, "text": "c²", "size": 50, "bold": True, "align": "center",
         "color": "pink"},
        {"type": "text", "x": 228, "y": 540, "text": "a", "size": 30, "color": "white"},
        {"type": "text", "x": 362, "y": 655, "text": "b", "size": 30, "color": "white"},
        {"type": "text", "x": 345, "y": 520, "text": "c", "size": 30, "color": "white"},

        {"type": "text", "id": "rule", "x": 800, "y": 250, "text": "a² + b² = c²", "size": 100, "bold": True,
         "color": "yellow"},
        {"type": "text", "x": 820, "y": 430, "text": "Example: a = 3, b = 4", "size": 40, "color": "white"},
        {"type": "text", "x": 820, "y": 510, "text": "3² + 4² = 9 + 16 = 25", "size": 46, "color": "white"},
        {"type": "text", "id": "answer", "x": 820, "y": 590, "text": "so c = √25 = **5**", "size": 50,
         "color": "white", "underline": "yellow"},
        {"type": "text", "x": 820, "y": 720, "width": 560, "size": 32, "color": "teal",
         "text": "The two small squares together have exactly the area of the big one."},
        {"op": "point", "id": "rule", "label": "remember this!"},
        {"op": "say", "text": "Count the squares: 9 + 16 makes 25!"},
    ]


def icons() -> Ops:
    """Every icon with its name: a reference sheet."""
    names = icon_names()
    cols = 15
    cell_w, cell_h = 104, 146
    ops: Ops = [
        {"op": "clear", "background": "whiteboard"},
        {"op": "settings", "mascot": False},
        {"type": "title", "text": f"{len(names)} hand-drawn icons", "size": 46, "y": 6},
    ]
    for i, name in enumerate(names):
        col, row = i % cols, i // cols
        x = 22 + col * cell_w
        y = 92 + row * cell_h
        ops.append({"type": "icon", "name": name, "x": x + 17, "y": y, "size": 70})
        ops.append({"type": "text", "x": x + 52, "y": y + 76, "text": name.replace("_", " "), "size": 16,
                    "align": "center", "font": "neat", "color": "gray"})
    return ops


DEMOS: Dict[str, Callable[[], Ops]] = {
    "plans": plans,
    "explain": explain,
    "showcase": showcase,
    "brainstorm": brainstorm,
    "lesson": lesson,
    "icons": icons,
}
