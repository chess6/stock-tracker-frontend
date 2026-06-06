from __future__ import annotations

import re
import subprocess
from typing import Any

from .config import REPO_ROOT


def _run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, check=check)


def slugify(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:max_len] or "fix"


def current_branch() -> str:
    result = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], check=False)
    return result.stdout.strip() if result.returncode == 0 else "master"


def create_task_branch(task: dict[str, Any]) -> str:
    branch = f"agent/fix-{task['id']}-{slugify(task['title'])}"
    base = current_branch()
    if base.startswith("agent/fix-"):
        _run(["git", "checkout", "master"], check=False)
        _run(["git", "checkout", "main"], check=False)
    _run(["git", "checkout", "-b", branch], check=False)
    task["branch"] = branch
    return branch


def commit_success(task: dict[str, Any], message: str) -> bool:
    files = task.get("files_modified") or []
    if not files:
        return False
    _run(["git", "add", *files], check=False)
    status = _run(["git", "status", "--porcelain"], check=False)
    if not status.stdout.strip():
        return False
    proc = subprocess.run(
        ["git", "commit", "-m", message],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    return proc.returncode == 0


def return_to_base() -> None:
    for base in ("master", "main"):
        proc = _run(["git", "checkout", base], check=False)
        if proc.returncode == 0:
            return
