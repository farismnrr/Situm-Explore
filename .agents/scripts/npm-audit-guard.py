#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

SEVERITY = {"info": 0, "low": 1, "moderate": 2, "high": 3, "critical": 4}


def usage() -> int:
    print("usage: npm-audit-guard.py <codebase-root> <exceptions-json>", file=sys.stderr)
    return 64


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"failed to load {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"{path} must contain a JSON object")
    return value


def resolve_sources(name: str, vulnerabilities: dict[str, dict], stack: set[str] | None = None) -> set[int]:
    if stack is None:
        stack = set()
    if name in stack:
        return set()
    stack = {*stack, name}
    vulnerability = vulnerabilities.get(name)
    if not isinstance(vulnerability, dict):
        return set()
    sources: set[int] = set()
    for item in vulnerability.get("via", []):
        if isinstance(item, dict):
            source = item.get("source")
            if isinstance(source, int):
                sources.add(source)
        elif isinstance(item, str):
            sources.update(resolve_sources(item, vulnerabilities, stack))
    return sources


def main() -> int:
    if len(sys.argv) != 3:
        return usage()

    codebase_root = Path(sys.argv[1]).resolve()
    exception_path = Path(sys.argv[2]).resolve()
    exceptions = load_json(exception_path)

    try:
        expires_on = date.fromisoformat(str(exceptions.get("expiresOn", "")))
    except ValueError as exc:
        raise RuntimeError("audit exception expiresOn must be YYYY-MM-DD") from exc
    if date.today() > expires_on:
        raise RuntimeError(f"audit exception expired on {expires_on.isoformat()}")

    allowed_sources_raw = exceptions.get("advisorySources", [])
    allowed_packages_raw = exceptions.get("packages", [])
    if not all(isinstance(item, int) for item in allowed_sources_raw) or not allowed_sources_raw:
        raise RuntimeError("audit exception advisorySources must be a non-empty integer list")
    if not all(isinstance(item, str) and item for item in allowed_packages_raw) or not allowed_packages_raw:
        raise RuntimeError("audit exception packages must be a non-empty string list")
    allowed_sources = set(allowed_sources_raw)
    allowed_packages = set(allowed_packages_raw)

    result = subprocess.run(
        ["npm", "audit", "--audit-level=high", "--json"],
        cwd=codebase_root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        payload = json.loads(result.stdout or "{}")
    except json.JSONDecodeError as exc:
        detail = (result.stdout + result.stderr).strip()
        raise RuntimeError(f"failed to parse npm audit JSON: {exc}" + (f"\n{detail}" if detail else "")) from exc

    vulnerabilities = payload.get("vulnerabilities", {})
    if not isinstance(vulnerabilities, dict):
        raise RuntimeError("npm audit JSON is missing vulnerabilities object")

    relevant: dict[str, dict] = {}
    for name, vulnerability in vulnerabilities.items():
        if not isinstance(name, str) or not isinstance(vulnerability, dict):
            continue
        severity = str(vulnerability.get("severity", "")).lower()
        if SEVERITY.get(severity, -1) >= SEVERITY["high"]:
            relevant[name] = vulnerability

    unexpected: list[str] = []
    allowed: list[str] = []
    for name, vulnerability in sorted(relevant.items()):
        severity = str(vulnerability.get("severity", "")).lower()
        sources = resolve_sources(name, vulnerabilities)
        if severity == "critical":
            unexpected.append(f"{name}: critical finding is never excepted")
            continue
        if name not in allowed_packages:
            unexpected.append(f"{name}: package is not in the exact exception allowlist")
            continue
        if not sources:
            unexpected.append(f"{name}: could not resolve concrete advisory source IDs")
            continue
        if not sources.issubset(allowed_sources):
            unexpected.append(f"{name}: advisory source IDs {sorted(sources)} are not fully allowlisted")
            continue
        allowed.append(f"{name}:{','.join(str(value) for value in sorted(sources))}")

    if unexpected:
        print("npm audit guard failed")
        for item in unexpected:
            print(f"- {item}")
        return 1

    if result.returncode == 0 and not relevant:
        print("npm audit guard passed: no high/critical vulnerabilities")
        return 0

    if not relevant:
        raise RuntimeError(f"npm audit exited {result.returncode} without high/critical findings")

    print(
        "npm audit guard passed with temporary exact exceptions: "
        f"findings={len(relevant)} expires={expires_on.isoformat()} "
        f"allowed={' ; '.join(allowed)}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"npm audit guard failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
