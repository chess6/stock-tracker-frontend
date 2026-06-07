from __future__ import annotations

import json
import re
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

from .config import PRIORITY, REPO_ROOT, get_budget
from .structured_log import log_event
from .task_manager import TaskManager, fingerprint

ESLINT_RE = re.compile(r"^(/.*\.(?:js|jsx))\s*$|^\s*(\d+):(\d+)\s+(error|warning)\s+(.+)$", re.MULTILINE)


class IssueScanner:
    def __init__(self, tasks: TaskManager) -> None:
        self.tasks = tasks
        self.budget = get_budget()
        self._last_full_scan_at: float = 0.0

    def scan_all(self) -> int:
        if self.tasks.list_tasks("pending"):
            log_event("scan_skipped", extra={"reason": "pending_backlog_exists"})
            return 0

        now = time.monotonic()
        due_full = (now - self._last_full_scan_at) >= self.budget.full_scan_interval_seconds
        mode = "full" if due_full else "light"
        log_event("scan_started", extra={"mode": mode})

        self._scan_remaining = self.budget.max_tasks_per_scan
        created = 0
        started = time.monotonic()

        phases = [("eslint", self._scan_eslint)]
        if due_full:
            phases.extend([
                ("build", self._scan_build),
                ("visual", self._scan_playwright_visual),
            ])
        phases.extend([
            ("health", self._scan_health),
            ("last_run", self._scan_last_run),
        ])

        for phase_name, scanner in phases:
            if self._scan_remaining <= 0:
                break
            log_event("scan_phase_started", extra={"phase": phase_name, "mode": mode})
            phase_created = scanner()
            created += phase_created
            log_event(
                "scan_phase_complete",
                extra={"phase": phase_name, "tasks_created": phase_created},
            )

        if due_full:
            self._last_full_scan_at = now

        elapsed = round(time.monotonic() - started, 1)
        log_event("scan_complete", extra={"tasks_created": created, "mode": mode, "elapsed_seconds": elapsed})
        return created

    def _log_suppressed(self, category: str, title: str, description: str) -> None:
        if self.tasks.exists_fingerprint(fingerprint(category, title, description)):
            log_event(
                "issue_suppressed",
                extra={"category": category, "title": title, "reason": "already_tracked"},
            )

    def _try_create(self, **kwargs) -> bool:
        if getattr(self, "_scan_remaining", 1) <= 0:
            return False
        task = self.tasks.create(**kwargs)
        if task:
            self._scan_remaining -= 1
        return task is not None

    def _run(self, cmd: list[str], timeout: int | None = None) -> subprocess.CompletedProcess:
        effective_timeout = timeout or self.budget.qa_command_timeout_seconds
        label = cmd[-1] if cmd else "command"
        log_event("subprocess_started", extra={"command": label, "timeout_seconds": effective_timeout})
        proc = subprocess.Popen(
            cmd,
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stop = threading.Event()

        def _heartbeat() -> None:
            while not stop.wait(30.0):
                log_event("subprocess_running", extra={"command": label})

        if effective_timeout >= 60:
            threading.Thread(target=_heartbeat, daemon=True).start()
        try:
            stdout, stderr = proc.communicate(timeout=effective_timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout, stderr = proc.communicate()
            stop.set()
            log_event("subprocess_timeout", extra={"command": label, "timeout_seconds": effective_timeout})
            return subprocess.CompletedProcess(cmd, returncode=124, stdout=stdout, stderr=stderr)
        finally:
            stop.set()
        log_event("subprocess_finished", extra={"command": label, "exit_code": proc.returncode})
        return subprocess.CompletedProcess(cmd, returncode=proc.returncode, stdout=stdout, stderr=stderr)

    def _scan_eslint(self) -> int:
        result = self._run(["npm", "run", "lint"], timeout=120)
        output = (result.stdout or "") + (result.stderr or "")
        if result.returncode == 0:
            return 0
        created = 0
        current_file = None
        for line in output.splitlines():
            if line.startswith(REPO_ROOT.as_posix()) or line.startswith("/") and line.endswith((".js", ".jsx")):
                current_file = line.strip()
                continue
            if " error " in line and current_file:
                if self._try_create(
                    category="eslint_error",
                    title=f"ESLint error in {Path(current_file).name}",
                    description=line.strip(),
                    source="eslint",
                    evidence={"file": current_file, "line": line.strip()},
                    priority=PRIORITY["eslint_error"],
                ):
                    created += 1
            elif " warning " in line and current_file:
                if self._try_create(
                    category="eslint_warning",
                    title=f"ESLint warning in {Path(current_file).name}",
                    description=line.strip(),
                    source="eslint",
                    evidence={"file": current_file, "line": line.strip()},
                    priority=PRIORITY["eslint_warning"],
                ):
                    created += 1
        if result.returncode != 0 and created == 0:
            if self._try_create(
                category="eslint_error",
                title="ESLint failed",
                description=output[-2000:],
                source="eslint",
                evidence={"exit_code": result.returncode},
            ):
                created += 1
        return created

    def _scan_build(self) -> int:
        result = self._run(["npm", "run", "build:check"], timeout=300)
        if result.returncode == 0:
            return 0
        output = (result.stdout or "") + (result.stderr or "")
        title = "Production build failed"
        description = output[-3000:]
        if self._try_create(
            category="build_failure",
            title=title,
            description=description,
            source="build",
            evidence={"exit_code": result.returncode},
            priority=PRIORITY["build_failure"],
        ):
            return 1
        self._log_suppressed("build_failure", title, description)
        return 0

    def _scan_playwright_visual(self) -> int:
        result = self._run(
            ["npm", "run", "test:visual"],
            timeout=self.budget.qa_command_timeout_seconds,
        )
        if result.returncode == 0:
            return 0
        output = (result.stdout or "") + (result.stderr or "")
        created = 0
        failures = [
            (match.group(1), match.group(2))
            for match in re.finditer(r"\[(\w+)\].*›.*visual regression › (.+)", output)
        ]
        if failures:
            tests = sorted({f"{name} ({viewport})" for viewport, name in failures})
            summary = "\n".join(f"- {item}" for item in tests[:30])
            if self._try_create(
                category="visual_regression",
                title="Playwright visual regression baselines out of date",
                description=(
                    f"{len(failures)} screenshot diff(s) across {len(tests)} test/viewport pair(s).\n"
                    f"Run `npm run test:visual:update` after intentional UI changes.\n\n{summary}"
                ),
                source="playwright_visual",
                evidence={
                    "failures": [{"viewport": v, "test": n} for v, n in failures[:50]],
                    "output_tail": output[-1500:],
                },
                priority=PRIORITY["visual_regression"],
            ):
                created += 1
        if created == 0:
            if self._try_create(
                category="playwright_failure",
                title="Playwright visual tests failed",
                description=output[-3000:],
                source="playwright",
                evidence={"exit_code": result.returncode},
                priority=PRIORITY["playwright_failure"],
            ):
                created += 1
        return created

    def _scan_health(self) -> int:
        result = self._run(
            ["npx", "playwright", "test", "e2e/health-scan.spec.js", "--reporter=line"],
            timeout=300,
        )
        report_path = REPO_ROOT / "agent_tasks" / "health-scan-report.json"
        if not report_path.exists():
            return 0
        report = json.loads(report_path.read_text(encoding="utf-8"))
        created = 0
        for err in report.get("console_errors", []):
            if self._try_create(
                category="console_error",
                title=f"Console error on {err.get('route', '/')}",
                description=err.get("text", ""),
                source="playwright_health",
                evidence=err,
                priority=PRIORITY["console_error"],
            ):
                created += 1
        for fail in report.get("api_failures", []):
            if fail.get("simulated"):
                continue
            if self._try_create(
                category="api_failure",
                title=f"API failure: {fail.get('url', 'unknown')}",
                description=fail.get("statusText") or str(fail.get("status")),
                source="playwright_health",
                evidence=fail,
                priority=PRIORITY["api_failure"],
            ):
                created += 1
        for ui in report.get("broken_ui", []):
            if self._try_create(
                category="broken_ui",
                title=f"Broken UI: {ui.get('route', '/')}",
                description=ui.get("reason", ""),
                source="playwright_health",
                evidence=ui,
                priority=PRIORITY["broken_ui"],
            ):
                created += 1
        if result.returncode != 0 and created == 0:
            if self._try_create(
                category="runtime_error",
                title="Health scan failed",
                description=(result.stdout or "") + (result.stderr or ""),
                source="playwright_health",
                priority=PRIORITY["runtime_error"],
            ):
                created += 1
        return created

    def _scan_last_run(self) -> int:
        last_run = REPO_ROOT / "test-results" / ".last-run.json"
        if not last_run.exists():
            return 0
        data = json.loads(last_run.read_text(encoding="utf-8"))
        if data.get("status") == "passed":
            return 0
        created = 0
        for failed in data.get("failedTests", []):
            if self._try_create(
                category="playwright_failure",
                title=f"Failed test: {failed}",
                description=str(failed),
                source="playwright_last_run",
                evidence={"failed_test": failed},
                priority=PRIORITY["playwright_failure"],
            ):
                created += 1
        return created
