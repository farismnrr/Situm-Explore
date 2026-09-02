#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE_DIR = ROOT / '.agents' / 'maintainability'
SOURCE_MAX_LINES = 350
FUNCTION_MAX_LINES = 120
MAX_CODE_FILES_PER_DIRECTORY = 12
IGNORED_PARTS = {
    '.git', 'node_modules', 'dist', 'build', 'coverage', 'target', 'vendor',
    '.nuxt', '.output', '.expo', '.gradle-agent-home', 'android', 'ios', 'generated',
}
CODE_SUFFIXES = {'.ts', '.tsx', '.vue', '.js', '.mjs', '.cjs'}
INLINE_BYPASS = re.compile(
    r'eslint-disable(?:-next-line|-line)?|@ts-ignore|@ts-nocheck|@ts-expect-error|'
    r'biome-ignore|prettier-ignore'
)


@dataclass(frozen=True)
class Codebase:
    name: str
    root: Path
    source_roots: tuple[Path, ...]
    eslint_config: str | None = None


def load_codebases() -> dict[str, Codebase]:
    config = ROOT / '.agents' / 'codebases.conf'
    result: dict[str, Codebase] = {}
    for raw in config.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split('|')
        parts += [''] * (6 - len(parts))
        name, root, _kind, source_roots, eslint_config, _traits = parts[:6]
        roots = tuple(Path(item) for item in source_roots.split(',') if item)
        result[name] = Codebase(
            name=name,
            root=(ROOT / root).resolve(),
            source_roots=roots,
            eslint_config=eslint_config or None,
        )
    return result


CODEBASES = load_codebases()


def usage() -> int:
    print('usage: python3 .agents/scripts/maintainability.py <codebase>', file=sys.stderr)
    print('codebases: ' + ', '.join(CODEBASES), file=sys.stderr)
    return 64


def is_test_path(path: Path) -> bool:
    value = '/' + path.as_posix().lower() + '/'
    name = path.name.lower()
    return (
        '/test/' in value
        or '/tests/' in value
        or '/__tests__/' in value
        or '/e2e/' in value
        or '/androidtest/' in value
        or '/fixtures/' in value
        or name.endswith(('_test.go', '.spec.ts', '.test.ts', '.spec.tsx', '.test.tsx', '.e2e-spec.ts'))
    )


def is_ignored(path: Path) -> bool:
    return any(part in IGNORED_PARTS for part in path.parts)


def iter_source_files(codebase: Codebase):
    seen: set[Path] = set()
    for relative_root in codebase.source_roots:
        source_root = (codebase.root / relative_root).resolve()
        if not source_root.exists():
            continue
        for path in source_root.rglob('*'):
            if not path.is_file() or path.suffix.lower() not in CODE_SUFFIXES:
                continue
            try:
                rel = path.resolve().relative_to(codebase.root)
            except ValueError:
                continue
            if rel in seen or is_ignored(rel) or is_test_path(rel):
                continue
            seen.add(rel)
            yield path, rel


def read_json(path: Path, errors: list[str]) -> dict:
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f'failed to load baseline {path.relative_to(ROOT)}: {exc}')
        return {}
    if not isinstance(data, dict):
        errors.append(f'baseline {path.relative_to(ROOT)} must be a JSON object')
        return {}
    return data


def validate_int_map(raw: object, label: str, minimum: int, errors: list[str]) -> dict[str, int]:
    if not isinstance(raw, dict):
        errors.append(f'{label} baseline must be an object')
        return {}
    result: dict[str, int] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not isinstance(value, int) or value <= minimum:
            errors.append(f'invalid {label} baseline entry {key!r}: ceiling must be integer > {minimum}')
            continue
        result[key] = value
    return result


def validate_bypass_map(raw: object, errors: list[str]) -> dict[str, int]:
    if not isinstance(raw, dict):
        errors.append('bypasses baseline must be an object')
        return {}
    result: dict[str, int] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not isinstance(value, int) or value <= 0:
            errors.append(f'invalid bypass baseline entry {key!r}: ceiling must be integer > 0')
            continue
        result[key] = value
    return result


def validate_function_map(raw: object, errors: list[str]) -> dict[str, list[int]]:
    if not isinstance(raw, dict):
        errors.append('function baseline must be an object')
        return {}
    result: dict[str, list[int]] = {}
    for key, value in raw.items():
        if (
            not isinstance(key, str)
            or not isinstance(value, list)
            or not value
            or any(not isinstance(item, int) or item <= FUNCTION_MAX_LINES for item in value)
            or value != sorted(value, reverse=True)
        ):
            errors.append(
                f'invalid function baseline entry {key!r}: expected descending integer ceilings > {FUNCTION_MAX_LINES}'
            )
            continue
        result[key] = value
    return result


def collect_files_and_directories(codebase: Codebase) -> tuple[dict[str, int], dict[str, int], dict[str, int], int]:
    oversized: dict[str, int] = {}
    bypasses: dict[str, int] = {}
    directory_counts: dict[Path, int] = {}
    scanned = 0
    for path, rel in iter_source_files(codebase):
        scanned += 1
        text = path.read_text(errors='replace')
        line_count = len(text.splitlines())
        if line_count > SOURCE_MAX_LINES:
            oversized[rel.as_posix()] = line_count
        bypass_count = len(INLINE_BYPASS.findall(text))
        if bypass_count:
            bypasses[rel.as_posix()] = bypass_count
        directory_counts[rel.parent] = directory_counts.get(rel.parent, 0) + 1
    dense = {
        ('.' if path == Path('.') else path.as_posix()): count
        for path, count in directory_counts.items()
        if count > MAX_CODE_FILES_PER_DIRECTORY
    }
    return dict(sorted(oversized.items())), dict(sorted(dense.items())), dict(sorted(bypasses.items())), scanned


def run_eslint_function_scan(codebase: Codebase, errors: list[str]) -> dict[str, list[int]]:
    if not codebase.eslint_config:
        return {}
    eslint = codebase.root / 'node_modules/.bin/eslint'
    if not eslint.exists():
        errors.append(f'{codebase.name}: ESLint binary unavailable at {eslint}')
        return {}
    if codebase.name == 'web' and not (ROOT / '.nuxt/eslint.config.mjs').exists():
        errors.append('web: .nuxt/eslint.config.mjs is missing; run engineering-guard.sh web fast first (it performs Nuxt prepare when needed)')
        return {}
    globs: list[str] = []
    for source_root in codebase.source_roots:
        globs.append(f'{source_root.as_posix()}/**/*.{{ts,tsx,js,mjs,cjs,vue}}')
    rule = json.dumps([
        'error',
        {'max': FUNCTION_MAX_LINES, 'skipBlankLines': True, 'skipComments': True, 'IIFEs': True},
    ], separators=(',', ':'))
    result = subprocess.run(
        [
            str(eslint), '--config', codebase.eslint_config, '--format', 'json',
            '--rule', f'max-lines-per-function:{rule}', *globs,
        ],
        cwd=codebase.root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        payload = json.loads(result.stdout or '[]')
    except json.JSONDecodeError as exc:
        detail = (result.stdout + result.stderr).strip()
        errors.append(f'{codebase.name}: failed to parse ESLint function scan: {exc}' + (f'\n{detail}' if detail else ''))
        return {}
    pattern = re.compile(r'\((?P<count>\d+)\)\. Maximum allowed is')
    observed: dict[str, list[int]] = {}
    for file_result in payload:
        raw_path = file_result.get('filePath')
        if not raw_path:
            continue
        try:
            rel = Path(raw_path).resolve().relative_to(codebase.root)
        except ValueError:
            continue
        if is_test_path(rel) or is_ignored(rel):
            continue
        counts: list[int] = []
        for message in file_result.get('messages', []):
            if message.get('ruleId') != 'max-lines-per-function':
                continue
            match = pattern.search(str(message.get('message', '')))
            if match:
                counts.append(int(match.group('count')))
        if counts:
            observed[rel.as_posix()] = sorted(counts, reverse=True)
    return dict(sorted(observed.items()))


def compare_int_ratchet(label: str, observed: dict[str, int], baseline: dict[str, int], limit: int, errors: list[str]) -> None:
    for key, current in observed.items():
        ceiling = baseline.get(key)
        if ceiling is None:
            errors.append(f'{label}: {key} is {current}, above limit {limit}, with no legacy baseline')
        elif current > ceiling:
            errors.append(f'{label}: {key} grew from ceiling {ceiling} to {current}')
        elif current < ceiling:
            errors.append(f'{label}: {key} improved from ceiling {ceiling} to {current}; lower the baseline')
    for key, ceiling in baseline.items():
        if key not in observed:
            errors.append(f'{label}: stale baseline {key}={ceiling}; debt is gone, remove the entry')


def compare_function_ratchet(observed: dict[str, list[int]], baseline: dict[str, list[int]], errors: list[str]) -> None:
    for key, current in observed.items():
        ceiling = baseline.get(key)
        if ceiling is None:
            errors.append(f'functions: {key} added oversized function debt {current}')
            continue
        if len(current) != len(ceiling):
            if len(current) < len(ceiling):
                errors.append(f'functions: {key} reduced oversized function count {ceiling} -> {current}; lower baseline')
            else:
                errors.append(f'functions: {key} added oversized functions {ceiling} -> {current}')
            continue
        for value, cap in zip(current, ceiling):
            if value > cap:
                errors.append(f'functions: {key} grew above ceiling {ceiling} -> {current}')
                break
            if value < cap:
                errors.append(f'functions: {key} improved below ceiling {ceiling} -> {current}; lower baseline')
                break
    for key, ceiling in baseline.items():
        if key not in observed:
            errors.append(f'functions: stale baseline {key}={ceiling}; oversized function debt is gone')


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in CODEBASES:
        return usage()
    codebase = CODEBASES[sys.argv[1]]
    errors: list[str] = []
    baseline_path = BASELINE_DIR / f'{codebase.name}.json'
    baseline_raw = read_json(baseline_path, errors)
    if baseline_raw.get('codebase') not in (None, codebase.name):
        errors.append(f'baseline codebase mismatch: expected {codebase.name!r}')

    file_baseline = validate_int_map(baseline_raw.get('files', {}), 'files', SOURCE_MAX_LINES, errors)
    directory_baseline = validate_int_map(baseline_raw.get('directories', {}), 'directories', MAX_CODE_FILES_PER_DIRECTORY, errors)
    bypass_baseline = validate_bypass_map(baseline_raw.get('bypasses', {}), errors)
    function_baseline = validate_function_map(baseline_raw.get('functions', {}), errors)

    oversized_files, dense_directories, bypasses, scanned = collect_files_and_directories(codebase)
    oversized_functions = run_eslint_function_scan(codebase, errors)

    compare_int_ratchet('files', oversized_files, file_baseline, SOURCE_MAX_LINES, errors)
    compare_int_ratchet('directories', dense_directories, directory_baseline, MAX_CODE_FILES_PER_DIRECTORY, errors)
    compare_int_ratchet('bypasses', bypasses, bypass_baseline, 0, errors)
    compare_function_ratchet(oversized_functions, function_baseline, errors)

    if errors:
        print(f'maintainability validation failed: {codebase.name}')
        for error in errors:
            for line in error.splitlines():
                print(f'- {line}')
        return 1

    print(
        f'maintainability validation passed: codebase={codebase.name} '
        f'scanned={scanned} file_debt={len(oversized_files)} '
        f'function_debt={sum(len(v) for v in oversized_functions.values())} '
        f'directory_debt={len(dense_directories)} bypass_debt={sum(bypasses.values())}'
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
