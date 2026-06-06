from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from .config import PRIORITY, REPO_ROOT
from .task_manager import TaskManager


class FollowUpGenerator:
    def __init__(self, tasks: TaskManager) -> None:
        self.tasks = tasks

    def generate(self, completed_task: dict[str, Any], max_tasks: int = 3) -> int:
        created = 0
        dirs = set()
        for file_path in completed_task.get("files_modified", []):
            dirs.add(Path(file_path).parent)

        for directory in dirs:
            if created >= max_tasks:
                break
            created += self._scan_directory(directory, completed_task["id"])

        return created

    def _scan_directory(self, directory: Path, parent_id: str) -> int:
        if not directory.exists():
            return 0
        proc = subprocess.run(
            ["npx", "eslint", str(directory), "--ext", ".js,.jsx", "--format", "compact"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=60,
        )
        created = 0
        for line in (proc.stdout or "").splitlines():
            if " Warning - " in line or " Error - " in line:
                parts = line.split(" - ", 2)
                if len(parts) < 3:
                    continue
                loc, severity, msg = parts[0], parts[1], parts[2]
                category = "eslint_error" if "Error" in severity else "eslint_warning"
                task = self.tasks.create(
                    category="followup_cleanup",
                    title=f"Adjacent cleanup: {Path(loc).name}",
                    description=msg.strip(),
                    source="followup_scan",
                    evidence={"file": loc, "message": msg, "parent": parent_id},
                    priority=PRIORITY["followup_cleanup"],
                    parent_task_id=parent_id,
                )
                if task:
                    created += 1
        return created
