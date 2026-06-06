from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import CURSOR_TASKS_DIR, REPO_ROOT, get_budget
from .structured_log import log_event

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore


@dataclass
class RepairResult:
    success: bool
    files_modified: list[str]
    file_edits: int
    ambiguous: bool
    deferred: bool
    summary: str
    failure_reason: str | None = None


class RepairExecutor:
    def __init__(self) -> None:
        self.budget = get_budget()

    def execute(self, task: dict[str, Any]) -> RepairResult:
        self._write_cursor_brief(task)
        rule_result = self._try_rule_based_fix(task)
        if rule_result.files_modified:
            return rule_result
        llm_result = self._try_llm_fix(task)
        if llm_result.files_modified or llm_result.ambiguous:
            return llm_result
        return RepairResult(
            success=False,
            files_modified=[],
            file_edits=0,
            ambiguous=False,
            deferred=True,
            summary="No automatic fix available — see .cursor/agent_tasks brief",
            failure_reason="awaiting_llm_or_cursor_agent",
        )

    def _write_cursor_brief(self, task: dict[str, Any]) -> None:
        CURSOR_TASKS_DIR.mkdir(parents=True, exist_ok=True)
        brief = f"""# Repair Task {task['id']}

**Category:** {task['category']}
**Priority:** {task['priority']}
**Title:** {task['title']}

## Description
{task['description']}

## Evidence
```json
{json.dumps(task.get('evidence', {}), indent=2)}
```

## Constraints
- Use existing UI primitives (DataGrid, Reactstrap, Bootstrap, heatMap.js)
- No arbitrary spacing/colors
- Run `npm run qa:frontend` after fix
- Max {self.budget.max_file_edits} file edits

## AGENTS.md
Follow frontend QA gate in AGENTS.md before completing.
"""
        path = CURSOR_TASKS_DIR / f"{task['id']}.md"
        path.write_text(brief, encoding="utf-8")

    def _try_rule_based_fix(self, task: dict[str, Any]) -> RepairResult:
        evidence = task.get("evidence", {})
        file_path = evidence.get("file")
        line_desc = evidence.get("line", "")
        if not file_path or task["category"] not in {"eslint_error", "eslint_warning"}:
            return RepairResult(False, [], 0, False, False, "no rule match")

        rel = self._rel_path(file_path)
        if not rel or not rel.exists():
            return RepairResult(False, [], 0, False, False, "file not found")

        content = rel.read_text(encoding="utf-8")
        modified = content
        edits = 0

        if "is defined but never used" in line_desc:
            var_match = re.search(r"'([^']+)' is defined but never used", line_desc)
            if var_match:
                symbol = var_match.group(1)
                modified, changed = self._remove_unused_import(modified, symbol)
                if changed:
                    edits += 1

        if modified != content and edits <= self.budget.max_file_edits:
            rel.write_text(modified, encoding="utf-8")
            log_event("rule_fix_applied", task_id=task["id"], files_modified=[str(rel)])
            return RepairResult(True, [str(rel)], edits, False, False, f"Removed unused symbol via rule engine")

        return RepairResult(False, [], 0, False, False, "rule engine no-op")

    def _remove_unused_import(self, content: str, symbol: str) -> tuple[str, bool]:
        lines = content.splitlines(keepends=True)
        for i, line in enumerate(lines):
            if line.strip().startswith("import ") and symbol in line:
                if "{" in line:
                    new_line = re.sub(rf",?\s*{re.escape(symbol)}\s*,?", "", line)
                    new_line = new_line.replace("{ ,", "{").replace(", }", " }")
                    if re.search(r"import\s*\{\s*\}\s*from", new_line):
                        lines.pop(i)
                        return "".join(lines), True
                    lines[i] = new_line
                    return "".join(lines), True
                lines.pop(i)
                return "".join(lines), True
        return content, False

    def _try_llm_fix(self, task: dict[str, Any]) -> RepairResult:
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key or httpx is None:
            return RepairResult(False, [], 0, False, False, "llm unavailable")

        evidence = task.get("evidence", {})
        file_path = evidence.get("file")
        context_files: dict[str, str] = {}
        if file_path:
            rel = self._rel_path(file_path)
            if rel and rel.exists():
                context_files[str(rel)] = rel.read_text(encoding="utf-8")[:12000]

        prompt = {
            "task": {
                "category": task["category"],
                "title": task["title"],
                "description": task["description"],
                "evidence": evidence,
            },
            "files": context_files,
            "instructions": (
                "Return JSON only: "
                '{"summary":"...","confidence":0.0-1.0,"ambiguous":false,'
                '"files":[{"path":"src/...","content":"full file content"}]}'
            ),
        }
        try:
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": "You fix React frontend bugs. JSON only."},
                        {"role": "user", "content": json.dumps(prompt)},
                    ],
                    "temperature": 0.1,
                },
                timeout=90.0,
            )
            response.raise_for_status()
            raw = json.loads(response.json()["choices"][0]["message"]["content"])
        except Exception as exc:
            return RepairResult(False, [], 0, False, False, "llm error", str(exc))

        if raw.get("ambiguous") or float(raw.get("confidence", 0)) < 0.6:
            return RepairResult(False, [], 0, True, False, raw.get("summary", "ambiguous fix"))

        modified: list[str] = []
        edits = 0
        for item in raw.get("files", [])[: self.budget.max_file_edits]:
            path = REPO_ROOT / item["path"]
            if not str(path).startswith(str(REPO_ROOT / "src")):
                continue
            path.write_text(item["content"], encoding="utf-8")
            modified.append(item["path"])
            edits += 1

        if not modified:
            return RepairResult(False, [], 0, True, False, "llm returned no safe file edits")

        return RepairResult(True, modified, edits, False, False, raw.get("summary", "llm fix applied"))

    def _rel_path(self, file_path: str) -> Path | None:
        p = Path(file_path)
        if p.is_absolute() and str(p).startswith(str(REPO_ROOT)):
            return p
        candidate = REPO_ROOT / file_path
        return candidate if candidate.exists() else None
