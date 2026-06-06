from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import LOG_DIR, ensure_dirs


def log_event(
    event: str,
    *,
    task_id: str | None = None,
    files_modified: list[str] | None = None,
    qa_status: str | None = None,
    retry_count: int | None = None,
    failure_reasons: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    ensure_dirs()
    payload: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
    }
    if task_id:
        payload["task_id"] = task_id
    if files_modified is not None:
        payload["files_modified"] = files_modified
    if qa_status is not None:
        payload["qa_status"] = qa_status
    if retry_count is not None:
        payload["retry_count"] = retry_count
    if failure_reasons:
        payload["failure_reasons"] = failure_reasons
    if extra:
        payload.update(extra)
    line = json.dumps(payload, default=str)
    print(line, flush=True)
    log_file = LOG_DIR / f"orchestrator-{datetime.now(timezone.utc).strftime('%Y%m%d')}.jsonl"
    with log_file.open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")
