"""
Tests for the AI whiteboard: board state, HTTP API, live events, snapshots,
the MCP server and the demo boards.
"""

import base64
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from whiteboard.demos import DEMOS
from whiteboard.reference import guide, icon_names
from whiteboard.server import make_server
from whiteboard.state import BoardError, BoardState, rects_intersect

ROOT = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------- helpers

@pytest.fixture()
def board_server(tmp_path):
    httpd = make_server(port=0, data_dir=tmp_path, persist=False)
    thread = threading.Thread(target=httpd.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{httpd.server_address[1]}"
    yield url, httpd.hub
    httpd.hub.close_all()
    httpd.shutdown()
    httpd.server_close()


def call(url, path, body=None, headers=None, method=None):
    data = None if body is None else json.dumps(body).encode()
    hdrs = {"Content-Type": "application/json"} if body is not None else {}
    hdrs.update(headers or {})
    req = urllib.request.Request(url + path, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
            ctype = resp.headers.get("Content-Type", "")
            return resp.status, (json.loads(raw) if "json" in ctype else raw)
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"{}")


class EventReader:
    """Minimal Server-Sent Events client that collects events on a thread."""

    def __init__(self, url):
        self.events = []
        self.resp = urllib.request.urlopen(url + "/api/events", timeout=10)
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self):
        try:
            for raw in self.resp:
                line = raw.decode("utf-8").strip()
                if line.startswith("data: "):
                    self.events.append(json.loads(line[6:]))
        except Exception:
            pass

    def wait_for(self, kind, timeout=5.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            for ev in self.events:
                if ev.get("type") == kind:
                    return ev
            time.sleep(0.02)
        raise AssertionError(f"no {kind!r} event; got {[e.get('type') for e in self.events]}")

    def close(self, hub):
        hub.close_all()  # ends the stream server-side, so the reader thread returns
        self.thread.join(timeout=3)
        self.resp.close()


# ---------------------------------------------------------------- board state

def test_aliases_ids_and_unknown_types():
    st = BoardState()
    added, _ = st.add([{"type": "note", "text": "hi"}, {"type": "Box", "x": 10, "y": 10}])
    assert [e["type"] for e in added] == ["sticky", "rect"]
    assert [e["id"] for e in added] == ["sticky1", "rect1"]
    with pytest.raises(BoardError, match="unknown element type"):
        st.add([{"type": "hologram"}])
    with pytest.raises(BoardError, match="must be a number"):
        st.add([{"type": "rect", "x": "left"}])
    with pytest.raises(BoardError, match="arrow needs"):
        st.add([{"type": "arrow", "from": "rect1"}])


def test_auto_placement_avoids_existing_elements():
    st = BoardState()
    st.add([{"type": "rect", "x": 30, "y": 30, "w": 600, "h": 400}])
    added, _ = st.add([{"type": "panel", "title": "Auto", "items": ["one", "two"]}])
    new_box = st.bbox_of(added[0]["id"])
    assert not rects_intersect(new_box, st.bbox_of("rect1"))
    assert 0 <= new_box[0] and new_box[0] + new_box[2] <= 1600


def test_auto_placement_starts_below_a_title():
    st = BoardState()
    added, _ = st.add([{"type": "title", "text": "Sprint plan"}, {"type": "panel", "title": "To do", "items": ["API"]}])
    title_box, panel_box = st.bbox_of("title1"), st.bbox_of(added[1]["id"])
    assert panel_box[1] >= title_box[1] + title_box[3]
    assert st.warnings_for(["title1", added[1]["id"]]) == []


def test_relative_placement_below_and_right_of():
    st = BoardState()
    st.add([{"type": "rect", "id": "a", "x": 100, "y": 100, "w": 200, "h": 100}])
    added, _ = st.add([
        {"type": "rect", "id": "b", "below": "a", "gap": 20, "w": 200, "h": 50},
        {"type": "rect", "id": "c", "right_of": "a", "w": 80, "h": 80},
    ])
    b, c = added
    assert (b["x"], b["y"]) == (100, 220)
    assert c["x"] == 330 and c["y"] == 100
    assert "below" not in b
    with pytest.raises(BoardError, match="unknown element"):
        st.add([{"type": "rect", "below": "nope"}])


def test_update_shift_undo_and_clear():
    st = BoardState()
    st.add([{"type": "rect", "id": "a", "x": 10, "y": 20, "w": 50, "h": 50, "color": "blue"}])
    st.update("a", {"dx": 5, "dy": -5, "color": "red"})
    assert (st.elements["a"]["x"], st.elements["a"]["y"], st.elements["a"]["color"]) == (15, 15, "red")
    assert st.undo()
    assert st.elements["a"]["color"] == "blue"
    st.clear()
    assert not st.elements
    assert st.undo()
    assert "a" in st.elements


def test_replacing_an_id_moves_it_to_the_top():
    st = BoardState()
    st.add([{"type": "rect", "id": "a", "x": 0, "y": 0}, {"type": "rect", "id": "b", "x": 300, "y": 0}])
    _, replaced = st.add([{"type": "ellipse", "id": "a", "x": 0, "y": 0}])
    assert replaced == ["a"]
    assert list(st.elements) == ["b", "a"]
    assert st.elements["a"]["type"] == "ellipse"


def test_warnings_and_occupancy():
    st = BoardState()
    st.add([{"type": "rect", "id": "a", "x": 100, "y": 100, "w": 300, "h": 200},
            {"type": "rect", "id": "b", "x": 250, "y": 150, "w": 300, "h": 200},
            {"type": "rect", "id": "c", "x": 1500, "y": 50, "w": 300, "h": 100}])
    warns = st.warnings_for(["b", "c"])
    assert any("b overlaps a" in w for w in warns)
    assert any("c extends past the board edge" in w for w in warns)
    occ = st.occupancy()
    rows = occ.splitlines()
    assert len(rows) == 11  # header + 10 rows of 100px
    assert rows[2][6 + 1] == "#"  # x=100..200, y=100..200 is used
    assert "M" in rows[-1]  # the mascot corner


def test_persistence_round_trip(tmp_path):
    path = tmp_path / "board.json"
    st = BoardState(path)
    st.add([{"type": "title", "text": "Saved"}])
    st.save_now()
    again = BoardState(path)
    assert again.elements["title1"]["text"] == "Saved"


# ---------------------------------------------------------------- HTTP API

def test_draw_get_update_erase(board_server):
    url, _ = board_server
    status, res = call(url, "/api/draw", {"elements": [
        {"type": "title", "text": "Hello"},
        {"type": "panel", "id": "p", "title": "Goals", "items": ["a", {"text": "b", "done": True}]},
        {"type": "arrow", "from": "title1", "to": "p", "label": "see"},
    ], "agent": "pytest"})
    assert status == 200 and res["ok"]
    assert [e["id"] for e in res["elements"]] == ["title1", "p", "arrow1"]
    assert all(len(e["bbox"]) == 4 for e in res["elements"])

    status, board = call(url, "/api/board?props=1")
    assert board["count"] == 3
    assert board["elements"][1]["props"]["title"] == "Goals"
    assert "occupancy" in board

    status, res = call(url, "/api/update", {"id": "p", "changes": {"color": "red"}})
    assert status == 200
    status, res = call(url, "/api/erase", {"ids": ["arrow1", "ghost"]})
    assert res["erased"] == ["arrow1"] and res["unknown_ids"] == ["ghost"]
    status, res = call(url, "/api/undo", {})
    assert res["ok"]
    status, board = call(url, "/api/board")
    assert board["count"] == 3


def test_bad_requests_are_explained(board_server):
    url, _ = board_server
    status, res = call(url, "/api/draw", {"elements": [{"type": "nope"}]})
    assert status == 400 and "unknown element type" in res["error"]
    status, res = call(url, "/api/draw", {"elements": []})
    assert status == 400
    # form posts and foreign hosts are refused
    req = urllib.request.Request(url + "/api/clear", data=b"x=1", headers={"Content-Type": "text/plain"})
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(req)
    assert err.value.code == 415
    status, res = call(url, "/api/health", headers={"Host": "evil.example.com"})
    assert status == 403


def test_static_viewer_and_guide(board_server):
    url, _ = board_server
    status, html = call(url, "/")
    assert status == 200 and b"AI Whiteboard" in html
    for name in ("app.js", "render.js", "icons.js", "style.css"):
        assert call(url, "/static/" + name)[0] == 200
    assert call(url, "/static/../server.py")[0] == 404
    status, res = call(url, "/api/guide?format=json")
    assert "rocket" in res["guide"] and "mindmap" in res["guide"]


def test_guide_lists_the_icon_library():
    names = icon_names()
    assert len(names) >= 80
    assert {"lightbulb", "rocket", "target", "calendar", "robot"} <= set(names)
    assert "Icons: lightbulb" in guide()


# ---------------------------------------------------------------- live events & snapshots

def test_events_stream_board_changes(board_server):
    url, hub = board_server
    reader = EventReader(url)
    try:
        hello = reader.wait_for("hello")
        assert hello["state"]["settings"]["width"] == 1600
        call(url, "/api/draw", {"elements": [{"type": "text", "text": "live!", "x": 5, "y": 5}]})
        add = reader.wait_for("add")
        assert add["elements"][0]["text"] == "live!"
        call(url, "/api/say", {"text": "Hi there"})
        assert reader.wait_for("say")["text"] == "Hi there"
        call(url, "/api/pause", {"seconds": 99})
        assert reader.wait_for("pause")["seconds"] == 30  # clamped
        call(url, "/api/clear", {"background": "chalkboard"})
        assert reader.wait_for("clear")["settings"]["background"] == "chalkboard"
    finally:
        reader.close(hub)


def test_viewer_layout_reports_replace_estimates(board_server):
    url, hub = board_server
    reader = EventReader(url)
    try:
        reader.wait_for("hello")

        def fake_viewer():
            add = reader.wait_for("add")
            call(url, "/api/layout", {"bboxes": {add["elements"][0]["id"]: [11, 22, 333, 44]}})

        threading.Thread(target=fake_viewer, daemon=True).start()
        status, res = call(url, "/api/draw", {"elements": [{"type": "text", "id": "t", "text": "measure me", "x": 11, "y": 22}]})
        assert res["elements"][0]["bbox"] == [11, 22, 333, 44]
        assert "bbox_estimated" not in res["elements"][0]
    finally:
        reader.close(hub)


def test_snapshot_round_trip_through_a_viewer(board_server):
    url, hub = board_server
    status, res = call(url, "/api/snapshot?timeout=1")
    assert status == 503 and "viewer" in res["error"]
    reader = EventReader(url)
    png = b"\x89PNG\r\n\x1a\nfake"
    try:
        reader.wait_for("hello")

        def fake_viewer():
            ev = reader.wait_for("snapshot")
            data = "data:image/png;base64," + base64.b64encode(png).decode()
            call(url, "/api/snapshot", {"req": ev["req"], "data": data})

        threading.Thread(target=fake_viewer, daemon=True).start()
        status, body = call(url, "/api/snapshot?timeout=5")
        assert status == 200 and body == png
    finally:
        reader.close(hub)


def test_save_and_load(board_server):
    url, _ = board_server
    call(url, "/api/draw", {"elements": [{"type": "title", "text": "Keep me"}]})
    assert call(url, "/api/save", {"name": "keeper"})[1]["ok"]
    call(url, "/api/clear", {})
    status, res = call(url, "/api/load", {"name": "keeper"})
    assert res["count"] == 1
    assert call(url, "/api/saves")[1]["saved"] == ["keeper"]
    status, res = call(url, "/api/load", {"name": "missing"})
    assert status == 400


# ---------------------------------------------------------------- demos

@pytest.mark.parametrize("name", sorted(DEMOS))
def test_demo_boards_are_valid(name, board_server):
    from whiteboard.__main__ import run_ops
    from whiteboard.client import Whiteboard

    url, hub = board_server
    wb = Whiteboard(url, agent="pytest", autostart=False, open_browser=False)
    results = run_ops(wb, DEMOS[name]())
    assert all(r.get("ok", True) for r in results if isinstance(r, dict))
    assert len(hub.state.elements) > 3


# ---------------------------------------------------------------- MCP server

def test_mcp_server_over_stdio(board_server):
    url, hub = board_server
    env = dict(os.environ, WHITEBOARD_URL=url, WHITEBOARD_NO_BROWSER="1", PYTHONIOENCODING="utf-8")
    proc = subprocess.Popen([sys.executable, str(ROOT / "whiteboard" / "mcp_server.py")],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)

    def rpc(msg):
        proc.stdin.write((json.dumps(msg) + "\n").encode())
        proc.stdin.flush()
        if "id" not in msg:
            return None
        return json.loads(proc.stdout.readline())

    try:
        init = rpc({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
            "protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "claude-code", "version": "1"}}})
        assert init["result"]["serverInfo"]["name"] == "ai-whiteboard"
        assert init["result"]["protocolVersion"] == "2025-06-18"
        rpc({"jsonrpc": "2.0", "method": "notifications/initialized"})

        tools = rpc({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})["result"]["tools"]
        names = {t["name"] for t in tools}
        assert {"draw", "look", "say", "get_board", "erase", "update", "guide"} <= names

        res = rpc({"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {
            "name": "draw", "arguments": {"elements": [{"type": "sticky", "text": "from MCP"}]}}})["result"]
        assert not res["isError"]
        payload = json.loads(res["content"][0]["text"])
        assert payload["elements"][0]["id"] == "sticky1"
        assert hub.state.elements["sticky1"]["agent"] == "Claude"

        bad = rpc({"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {
            "name": "draw", "arguments": {"elements": [{"type": "warp"}]}}})["result"]
        assert bad["isError"] and "unknown element type" in bad["content"][0]["text"]

        missing = rpc({"jsonrpc": "2.0", "id": 5, "method": "nope"})
        assert missing["error"]["code"] == -32601
    finally:
        proc.stdin.close()
        proc.wait(timeout=10)
        proc.stdout.close()
        proc.stderr.close()
