#!/usr/bin/env python3
"""Continuously running autonomous frontend repair orchestrator."""

from __future__ import annotations

import signal
import sys
import time
from typing import Any

from .config import ensure_dirs, get_budget
from .followup import FollowUpGenerator
from .git_workflow import commit_success, create_task_branch, return_to_base
from .issue_scanner import IssueScanner
from .qa_runner import QARunner
from .repair_executor import RepairExecutor
from .structured_log import log_event
from .task_manager import TaskManager

_running = True


def _handle_stop(*_args) -> None:
    global _running
    _running = False
    log_event("orchestrator_stopping")


class AutonomousLoop:
    def __init__(self) -> None:
        ensure_dirs()
        self.budget = get_budget()
        self.tasks = TaskManager()
        self.scanner = IssueScanner(self.tasks)
        self.repair = RepairExecutor()
        self.qa = QARunner()
        self.followup = FollowUpGenerator(self.tasks)
        self.consecutive_failures = 0
        self.last_failure_fingerprint: str | None = None

    def _interruptible_sleep(self, seconds: float) -> None:
        """Sleep in 5s chunks so Ctrl+C is responsive and heartbeats can fire."""
        end = time.monotonic() + seconds
        while _running and time.monotonic() < end:
            time.sleep(min(5.0, end - time.monotonic()))

    def run_forever(self) -> None:
        signal.signal(signal.SIGINT, _handle_stop)
        signal.signal(signal.SIGTERM, _handle_stop)
        log_event("orchestrator_started", extra={"budget": self.budget.__dict__})

        while _running:
            try:
                if not self._tick():
                    log_event(
                        "orchestrator_idle",
                        extra={
                            "sleep_seconds": self.budget.scan_interval_seconds,
                            "hint": "Ctrl+C to stop; next scan follows sleep",
                        },
                    )
                    self._interruptible_sleep(self.budget.scan_interval_seconds)
            except Exception as exc:
                log_event("orchestrator_error", failure_reasons=[str(exc)])
                self._interruptible_sleep(self.budget.scan_interval_seconds)

        log_event("orchestrator_stopped")

    def _tick(self) -> bool:
        if self.consecutive_failures >= self.budget.max_consecutive_failures:
            log_event(
                "stop_condition",
                failure_reasons=["repeated_unresolved_qa_failure"],
                extra={"consecutive_failures": self.consecutive_failures},
            )
            time.sleep(self.budget.scan_interval_seconds * 2)
            self.consecutive_failures = 0
            return False

        active = self.tasks.list_tasks("active")
        if active:
            return self._continue_active(active[0])

        created = self.scanner.scan_all()
        task = self.tasks.pick_next()
        if not task:
            if created == 0:
                log_event("orchestrator_no_work", extra={"pending": 0, "failed": len(self.tasks.list_tasks("failed"))})
            return False

        return self._process_task(task)

    def _continue_active(self, task: dict[str, Any]) -> bool:
        log_event("resume_active_task", task_id=task["id"])
        return self._process_task(task)

    def _process_task(self, task: dict[str, Any]) -> bool:
        task = self.tasks.move(task, "active")
        started = time.monotonic()
        log_event("task_started", task_id=task["id"], extra={"category": task["category"]})

        while task["retry_count"] < self.budget.max_retries:
            if time.monotonic() - started > self.budget.task_timeout_seconds:
                task["stop_reason"] = "timeout"
                task["failure_reasons"].append("task_timeout_exceeded")
                break

            repair = self.repair.execute(task)
            task["file_edits"] += repair.file_edits
            task["files_modified"] = list(set(task.get("files_modified", []) + repair.files_modified))

            if repair.deferred:
                task["stop_reason"] = "deferred_to_cursor"
                task["failure_reasons"].append(repair.summary)
                log_event(
                    "repair_deferred",
                    task_id=task["id"],
                    failure_reasons=[repair.summary],
                    extra={"brief": f".cursor/agent_tasks/{task['id']}.md"},
                )
                break

            if repair.ambiguous:
                task["stop_reason"] = "architectural_ambiguity"
                task["failure_reasons"].append(repair.summary)
                log_event(
                    "repair_ambiguous",
                    task_id=task["id"],
                    failure_reasons=[repair.summary],
                )
                break

            if task["file_edits"] > self.budget.max_file_edits:
                task["stop_reason"] = "repair_budget_exhausted"
                task["failure_reasons"].append("max_file_edits_exceeded")
                break

            if not repair.files_modified:
                task["retry_count"] += 1
                task["failure_reasons"].append(repair.failure_reason or "no_fix_applied")
                continue

            if not task.get("branch"):
                branch = create_task_branch(task)
                log_event("branch_created", task_id=task["id"], extra={"branch": branch})

            qa = self.qa.run_full()
            task["qa_status"] = "passed" if qa.passed else f"failed:{qa.stage}"

            if qa.passed:
                message = f"fix({task['id']}): {task['title']}\n\nAuto-repair via orchestrator.\n{repair.summary}"
                committed = commit_success(task, message)
                task = self.tasks.move(task, "completed")
                self.consecutive_failures = 0
                followups = self.followup.generate(task)
                return_to_base()
                log_event(
                    "task_completed",
                    task_id=task["id"],
                    files_modified=task["files_modified"],
                    qa_status="passed",
                    retry_count=task["retry_count"],
                    extra={"committed": committed, "followups_created": followups},
                )
                return True

            task["retry_count"] += 1
            task["failure_reasons"].append(qa.output[-500:])
            log_event(
                "qa_failed",
                task_id=task["id"],
                qa_status=task["qa_status"],
                retry_count=task["retry_count"],
                failure_reasons=[qa.output[-300:]],
            )

        return self._fail_task(task)

    def _fail_task(self, task: dict[str, Any]) -> bool:
        fp = task.get("fingerprint")
        if fp and fp == self.last_failure_fingerprint:
            self.consecutive_failures += 1
        else:
            self.consecutive_failures = 1
            self.last_failure_fingerprint = fp

        task = self.tasks.move(task, "failed")
        return_to_base()
        log_event(
            "task_failed",
            task_id=task["id"],
            qa_status=task.get("qa_status"),
            retry_count=task["retry_count"],
            failure_reasons=task.get("failure_reasons", [])[-5:],
            extra={"stop_reason": task.get("stop_reason")},
        )
        return True


def main() -> None:
    AutonomousLoop().run_forever()


if __name__ == "__main__":
    main()
