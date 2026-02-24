import argparse
import json
import math
import os
import random
import shutil
import signal
import socket
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List

RESET = "\033[0m"
HIDE_CURSOR = "\033[?25l"
SHOW_CURSOR = "\033[?25h"
CLEAR_HOME = "\033[2J\033[H"
HOME = "\033[H"


@dataclass
class ServiceTarget:
    name: str
    port: int
    required: bool = True


@dataclass
class Stream:
    x: int
    y: float
    speed: float
    text: str


def enable_vt_mode() -> None:
    if os.name != "nt":
        return
    try:
        import ctypes

        k32 = ctypes.windll.kernel32
        h = k32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if k32.GetConsoleMode(h, ctypes.byref(mode)):
            k32.SetConsoleMode(h, mode.value | 0x0004)
    except Exception:
        pass


def rgb(r: int, g: int, b: int) -> str:
    return f"\033[38;2;{r};{g};{b}m"


def bg_rgb(r: int, g: int, b: int) -> str:
    return f"\033[48;2;{r};{g};{b}m"


def term_size(default_w: int, default_h: int) -> tuple[int, int]:
    t = shutil.get_terminal_size((default_w, default_h))
    return t.columns, t.lines


def put(chars, colors, x: int, y: int, text: str, color: str) -> None:
    h = len(chars)
    w = len(chars[0]) if h else 0
    if y < 0 or y >= h:
        return
    for i, ch in enumerate(text):
        xx = x + i
        if 0 <= xx < w:
            chars[y][xx] = ch
            colors[y][xx] = color


def draw_box(chars, colors, x: int, y: int, w: int, h: int, title: str, line_color: str, title_color: str) -> None:
    if w < 6 or h < 4:
        return
    top = "+" + "-" * (w - 2) + "+"
    mid = "|" + " " * (w - 2) + "|"
    put(chars, colors, x, y, top, line_color)
    for yy in range(y + 1, y + h - 1):
        put(chars, colors, x, yy, mid, line_color)
    put(chars, colors, x, y + h - 1, top, line_color)
    t = f" {title} "
    tx = x + max(1, (w - len(t)) // 2)
    put(chars, colors, tx, y, t[: max(0, w - 2)], title_color)


def render(chars, colors) -> str:
    out: List[str] = [HOME]
    for row_chars, row_colors in zip(chars, colors):
        cur = ""
        row_out: List[str] = []
        for ch, col in zip(row_chars, row_colors):
            if col != cur:
                row_out.append(col)
                cur = col
            row_out.append(ch)
        row_out.append(RESET)
        out.append("".join(row_out))
    return "\n".join(out)


def check_port(port: int, timeout: float = 0.12) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def read_backend_port(repo_root: Path) -> int:
    p = repo_root / ".runtime" / "backend-port.txt"
    if not p.exists():
        return 8080
    try:
        value = p.read_text(encoding="utf-8").strip()
        return int(value)
    except Exception:
        return 8080


def read_active_mode(repo_root: Path) -> str:
    p = repo_root / ".runtime" / "pmd-active-mode.json"
    if not p.exists():
        return "unknown"
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        mode = str(data.get("mode", "unknown")).strip()
        return mode or "unknown"
    except Exception:
        return "unknown"


def status_color(ok: bool) -> str:
    return rgb(90, 255, 140) if ok else rgb(255, 110, 110)


def make_streams(width: int, words: List[str]) -> List[Stream]:
    streams: List[Stream] = []
    count = max(10, width // 11)
    for _ in range(count):
        text = random.choice(words)
        x = random.randint(0, max(0, width - len(text) - 1))
        streams.append(Stream(x=x, y=random.uniform(-10, 0), speed=random.uniform(0.25, 0.8), text=text))
    return streams


def main() -> None:
    parser = argparse.ArgumentParser(description="PMD thematic ops cockpit")
    parser.add_argument("--fps", type=int, default=18)
    parser.add_argument("--duration", type=float, default=0.0, help="0 = infinite")
    parser.add_argument("--width", type=int, default=120)
    parser.add_argument("--height", type=int, default=36)
    args = parser.parse_args()

    enable_vt_mode()

    this_file = Path(__file__).resolve()
    repo_root = this_file.parent.parent

    width, height = term_size(args.width, args.height)
    width = max(88, min(width, args.width))
    height = max(24, min(height, args.height))

    words = [
        "PMD", "DASHBOARD", "WORKSPACE", "SPRINT", "BACKLOG", "REVIEW",
        "ASSIGNED", "IN-PROGRESS", "COMPLETED", "ARCHIVED", "RETRO", "DEPLOY",
    ]
    streams = make_streams(width, words)

    running = True

    def stop_handler(*_):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, stop_handler)

    start = time.perf_counter()
    frame = 0
    budget = 1.0 / max(1, args.fps)

    print(CLEAR_HOME + HIDE_CURSOR, end="", flush=True)

    try:
        while running:
            t0 = time.perf_counter()

            backend_port = read_backend_port(repo_root)
            active_mode = read_active_mode(repo_root)
            targets = [
                ServiceTarget("Frontend", 5173, True),
                ServiceTarget("Backend", backend_port, True),
                ServiceTarget("Mongo", 27017, True),
                ServiceTarget("MailHog UI", 8025, False),
                ServiceTarget("SMTP", 1025, False),
            ]
            states = [(t, check_port(t.port)) for t in targets]
            up_count = sum(1 for _, ok in states if ok)

            chars = [[" " for _ in range(width)] for _ in range(height)]
            colors = [["" for _ in range(width)] for _ in range(height)]

            # Background bands
            for y in range(height):
                base = int(10 + 8 * math.sin(frame * 0.04 + y * 0.1))
                c = bg_rgb(0, 0, max(0, base))
                for x in range(width):
                    colors[y][x] = c

            # Streams
            for s in streams:
                s.y += s.speed
                if int(s.y) >= height:
                    s.y = random.uniform(-8, -1)
                    s.text = random.choice(words)
                    s.x = random.randint(0, max(0, width - len(s.text) - 1))
                    s.speed = random.uniform(0.25, 0.8)
                fade = int(120 + 100 * math.sin((frame + s.x) * 0.05))
                put(chars, colors, s.x, int(s.y), s.text, rgb(0, max(80, min(255, fade)), 140))

            # Header
            title = "PMD OPS MATRIX"
            subtitle = "PROJECT MANAGEMENT DASHBOARD"
            put(chars, colors, max(0, (width - len(title)) // 2), 1, title, rgb(130, 255, 255))
            put(chars, colors, max(0, (width - len(subtitle)) // 2), 2, subtitle, rgb(175, 175, 210))

            now = time.strftime("%H:%M:%S")
            elapsed = int(time.perf_counter() - start)
            put(chars, colors, width - len(now) - 3, 1, now, rgb(255, 220, 110))
            put(chars, colors, width - 16, 2, f"Uptime {elapsed:>4}s", rgb(190, 190, 190))

            # System box
            box_w = max(34, width // 3)
            draw_box(chars, colors, 2, 4, box_w, 9, "Runtime", rgb(100, 100, 170), rgb(120, 220, 255))
            put(chars, colors, 4, 6, f"Mode: {active_mode}", rgb(220, 220, 240))
            put(chars, colors, 4, 7, f"Repo: {repo_root.name}", rgb(180, 180, 220))
            put(chars, colors, 4, 8, f"Backend Port File: {backend_port}", rgb(180, 180, 220))
            put(chars, colors, 4, 10, f"Services Up: {up_count}/{len(states)}", rgb(100, 255, 150) if up_count >= 3 else rgb(255, 130, 130))

            # Services box
            sx = box_w + 5
            sw = width - sx - 3
            draw_box(chars, colors, sx, 4, sw, 12, "Local Service Health", rgb(100, 100, 170), rgb(255, 180, 120))
            row = 6
            for target, ok in states:
                mark = "UP" if ok else "DOWN"
                put(chars, colors, sx + 2, row, f"{target.name:<12} : {target.port:<5} [{mark}]", status_color(ok))
                row += 2

            # Timeline lane
            phases = ["DISCOVERY", "PLAN", "BUILD", "TEST", "REVIEW", "RELEASE", "MONITOR"]
            y_lane = height - 5
            lane = " -> ".join(phases)
            segment = (lane + "   " + lane)
            shift = frame % len(lane + "   ")
            text = (segment[shift:] + segment[:shift])[: max(0, width - 4)]
            put(chars, colors, 2, y_lane, text, rgb(120, 255, 200))

            # Footer
            tip = "Ctrl+C exit | Theme: PMD Ops | uses .runtime backend port + active mode"
            put(chars, colors, max(0, (width - len(tip)) // 2), height - 1, tip[:width], rgb(165, 165, 165))

            print(render(chars, colors), end="", flush=True)

            frame += 1
            if args.duration > 0 and (time.perf_counter() - start) >= args.duration:
                break

            elapsed_loop = time.perf_counter() - t0
            if elapsed_loop < budget:
                time.sleep(budget - elapsed_loop)

    finally:
        print(RESET + SHOW_CURSOR + "\n", end="", flush=True)


if __name__ == "__main__":
    main()
