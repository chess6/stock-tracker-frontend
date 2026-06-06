from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from . import config
from .config import PRIORITY, ensure_dirs

TaskStatus = Literal["pending", "active", "completed", "failed"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def fingerprint(category: str, title: str, detail: str = "") -> str:
    raw = f"{category}|{title}|{detail[:500]}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


class TaskManager:
    def __init__(self) -> None:
        ensure_dirs()

    def _path(self, status: TaskStatus, task_id: str) -> Path:
        return config.TASK_DIRS[status] / f"{task_id}.json"

    def list_tasks(self, status: TaskStatus) -> list[dict[str, Any]]:
        tasks = []
        for path in sorted(config.TASK_DIRS[status].glob("*.json")):
            tasks.append(self._read(path))
        return sorted(tasks, key=lambda t: (t.get("priority", 999), t.get("created_at", "")))

    def _read(self, path: Path) -> dict[str, Any]:
        return json.loads(path.read_text(encoding="utf-8"))

    def get(self, task_id: str, status: TaskStatus | None = None) -> dict[str, Any] | None:
        if status:
            path = self._path(status, task_id)
            return self._read(path) if path.exists() else None
        for st in config.TASK_DIRS:
            path = self._path(st, task_id)
            if path.exists():
                return self._read(path)
        return None

    def exists_fingerprint(self, fp: str) -> bool:
        """Dedup across all buckets — failed tasks stay suppressed until manually cleared."""
        for status in config.TASK_DIRS:
            for path in config.TASK_DIRS[status].glob("*.json"):
                task = self._read(path)
                if task.get("fingerprint") == fp:
                    return True
        return False

    def create(
        self,
        *,
        category: str,
        title: str,
        description: str,
        source: str,
        evidence: dict[str, Any] | None = None,
        priority: int | None = None,
        parent_task_id: str | None = None,
    ) -> dict[str, Any] | None:
        fp = fingerprint(category, title, description)
        if self.exists_fingerprint(fp):
            return None
        task_id = str(uuid.uuid4())[:8]
        task = {
            "id": task_id,
            "fingerprint": fp,
            "category": category,
            "title": title,
            "description": description,
            "source": source,
            "evidence": evidence or {},
            "priority": priority if priority is not None else PRIORITY.get(category, 80),
            "status": "pending",
            "retry_count": 0,
            "file_edits": 0,
            "branch": None,
            "files_modified": [],
            "qa_status": None,
            "failure_reasons": [],
            "stop_reason": None,
            "parent_task_id": parent_task_id,
            "created_at": _now(),
            "updated_at": _now(),
        }
        self._write(task, "pending")
        return task

    def _write(self, task: dict[str, Any], status: TaskStatus) -> None:
        task["status"] = status
        task["updated_at"] = _now()
        dest = self._path(status, task["id"])
        dest.write_text(json.dumps(task, indent=2), encoding="utf-8")

    def move(self, task: dict[str, Any], to_status: TaskStatus) -> dict[str, Any]:
        for status in config.TASK_DIRS:
            old = self._path(status, task["id"])
            if old.exists():
                old.unlink()
        self._write(task, to_status)
        return task

    def update(self, task: dict[str, Any]) -> dict[str, Any]:
        status = task.get("status", "pending")
        self._write(task, status)  # type: ignore[arg-type]
        return task

    def pick_next(self) -> dict[str, Any] | None:
        if list(self.list_tasks("active")):
            return None
        pending = self.list_tasks("pending")
        return pending[0] if pending else None
