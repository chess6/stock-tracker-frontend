from __future__ import annotations

import subprocess
from dataclasses import dataclass

from .config import REPO_ROOT, get_budget


@dataclass
class QAResult:
    passed: bool
    stage: str
    output: str


class QARunner:
    def __init__(self) -> None:
        self.budget = get_budget()

    def run_full(self) -> QAResult:
        stages = [
            (["npm", "run", "lint"], "lint"),
            (["npm", "test", "--", "--watchAll=false", "--runInBand"], "unit_tests"),
            (["npm", "run", "test:visual"], "visual_regression"),
        ]
        combined = []
        for cmd, name in stages:
            result = self._run(cmd, env={"CI": "true"})
            combined.append(f"=== {name} ===\n{result.output}")
            if not result.passed:
                return QAResult(False, name, "\n".join(combined))
        return QAResult(True, "all", "\n".join(combined))

    def _run(self, cmd: list[str], env: dict[str, str] | None = None) -> QAResult:
        import os

        run_env = {**os.environ, **(env or {})}
        proc = subprocess.run(
            cmd,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=self.budget.qa_command_timeout_seconds,
            env=run_env,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        return QAResult(proc.returncode == 0, cmd[-1], output[-8000:])
