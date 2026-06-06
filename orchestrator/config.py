from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
AGENT_TASKS_DIR = REPO_ROOT / "agent_tasks"
TASK_DIRS = {
    "pending": AGENT_TASKS_DIR / "pending",
    "active": AGENT_TASKS_DIR / "active",
    "completed": AGENT_TASKS_DIR / "completed",
    "failed": AGENT_TASKS_DIR / "failed",
}
LOG_DIR = REPO_ROOT / "orchestrator" / "logs"
CURSOR_TASKS_DIR = REPO_ROOT / ".cursor" / "agent_tasks"


@dataclass(frozen=True)
class Budget:
    max_retries: int = 5
    max_file_edits: int = 20
    task_timeout_seconds: int = 1800
    max_consecutive_failures: int = 3
    scan_interval_seconds: float = 120.0
    qa_command_timeout_seconds: int = 600
    max_tasks_per_scan: int = 15
    overflow_threshold_px: int = 48
    full_scan_interval_seconds: float = 600.0


# Lower number = higher priority
PRIORITY = {
    "runtime_error": 10,
    "console_error": 15,
    "broken_ui": 20,
    "api_failure": 25,
    "build_failure": 30,
    "visual_regression": 40,
    "playwright_failure": 45,
    "eslint_error": 50,
    "eslint_warning": 60,
    "followup_cleanup": 70,
}


def get_budget() -> Budget:
    return Budget(
        max_retries=int(os.getenv("AGENT_MAX_RETRIES", "5")),
        max_file_edits=int(os.getenv("AGENT_MAX_FILE_EDITS", "20")),
        task_timeout_seconds=int(os.getenv("AGENT_TASK_TIMEOUT", "1800")),
        scan_interval_seconds=float(os.getenv("AGENT_SCAN_INTERVAL", "120")),
        max_tasks_per_scan=int(os.getenv("AGENT_MAX_TASKS_PER_SCAN", "15")),
        overflow_threshold_px=int(os.getenv("AGENT_OVERFLOW_THRESHOLD_PX", "48")),
        full_scan_interval_seconds=float(os.getenv("AGENT_FULL_SCAN_INTERVAL", "600")),
    )


def ensure_dirs() -> None:
    for path in (*TASK_DIRS.values(), LOG_DIR, CURSOR_TASKS_DIR):
        path.mkdir(parents=True, exist_ok=True)
