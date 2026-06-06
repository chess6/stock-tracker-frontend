import json
import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def task_env(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        tasks_dir = root / "agent_tasks"
        for name in ("pending", "active", "completed", "failed"):
            (tasks_dir / name).mkdir(parents=True)
        monkeypatch.setattr("orchestrator.config.REPO_ROOT", root)
        monkeypatch.setattr("orchestrator.config.AGENT_TASKS_DIR", tasks_dir)
        monkeypatch.setattr(
            "orchestrator.config.TASK_DIRS",
            {
                "pending": tasks_dir / "pending",
                "active": tasks_dir / "active",
                "completed": tasks_dir / "completed",
                "failed": tasks_dir / "failed",
            },
        )
        yield root


def test_create_and_pick(task_env):
    from orchestrator.task_manager import TaskManager

    tm = TaskManager()
    t1 = tm.create(
        category="build_failure",
        title="Build failed",
        description="error",
        source="build",
        priority=30,
    )
    assert t1 is not None
    t2 = tm.create(
        category="build_failure",
        title="Build failed",
        description="error",
        source="build",
        priority=30,
    )
    assert t2 is None  # deduped
    nxt = tm.pick_next()
    assert nxt["id"] == t1["id"]


def test_failed_fingerprint_still_dedupes(task_env):
    from orchestrator.task_manager import TaskManager

    tm = TaskManager()
    t1 = tm.create(
        category="broken_ui",
        title="Broken UI: /",
        description="overflow",
        source="health",
        priority=20,
    )
    tm.move(t1, "failed")
    t2 = tm.create(
        category="broken_ui",
        title="Broken UI: /",
        description="overflow",
        source="health",
        priority=20,
    )
    assert t2 is None
