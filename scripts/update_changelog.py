#!/usr/bin/env python3
"""Automate CHANGELOG updates for pipeline runs and releases."""
from __future__ import annotations

import argparse
import re
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CHANGELOG_PATH = REPO_ROOT / "CHANGELOG.md"
UNRELEASED_HEADER = "## [Unreleased]"
PLACEHOLDER = "- _No unreleased changes yet_"
VERSION_PATTERN = re.compile(r"^## \[v(\d+)\.(\d+)\.(\d+)\]")


class ChangelogError(RuntimeError):
    """Custom error raised when CHANGELOG operations fail."""


def read_lines() -> list[str]:
    if not CHANGELOG_PATH.exists():
        raise ChangelogError("CHANGELOG.md not found")
    return CHANGELOG_PATH.read_text(encoding="utf-8").splitlines()


def write_lines(lines: list[str]) -> None:
    # Ensure file ends with a newline
    content = "\n".join(lines).rstrip("\n") + "\n"
    CHANGELOG_PATH.write_text(content, encoding="utf-8")


def find_section(lines: list[str], header: str) -> tuple[int, int]:
    try:
        start = next(i for i, line in enumerate(lines) if line.strip() == header)
    except StopIteration as exc:  # pragma: no cover - defensive
        raise ChangelogError(f"Section {header} not found") from exc
    end = len(lines)
    for idx in range(start + 1, len(lines)):
        if lines[idx].startswith("## [") and lines[idx].strip() != header:
            end = idx
            break
    return start, end


def build_unreleased_section(entries: list[str] | None = None) -> list[str]:
    entries = [entry for entry in (entries or []) if entry.strip()]
    if not entries:
        entries = [PLACEHOLDER]
    return [UNRELEASED_HEADER, *entries, ""]


def ensure_unreleased_section(lines: list[str]) -> list[str]:
    if any(line.strip() == UNRELEASED_HEADER for line in lines):
        start, end = find_section(lines, UNRELEASED_HEADER)
        section_body = [line for line in lines[start + 1 : end] if line.strip()]
        if not section_body:
            lines = lines[:start] + build_unreleased_section([]) + lines[end:]
        return lines

    # Insert unreleased section before the first version entry (or at the end)
    insertion_index = None
    for idx, line in enumerate(lines):
        if line.startswith("## [v"):
            insertion_index = idx
            break

    section = build_unreleased_section([])
    if insertion_index is None:
        # Append to the end, ensure a blank line if content exists
        if lines and lines[-1].strip():
            lines.append("")
        lines.extend(section)
    else:
        if insertion_index > 0 and lines[insertion_index - 1].strip():
            section = [""] + section
        lines = lines[:insertion_index] + section + lines[insertion_index:]
    return lines


def bump_patch(version: tuple[int, int, int]) -> tuple[int, int, int]:
    major, minor, patch = version
    return major, minor, patch + 1


def extract_current_version(lines: list[str]) -> tuple[int, int, int]:
    for line in lines:
        match = VERSION_PATTERN.match(line.strip())
        if match:
            return tuple(int(part) for part in match.groups())
    return (0, 0, 0)


def append_unreleased_entry(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    entry = f"- {message.strip()} ({timestamp})"

    lines = read_lines()
    lines = ensure_unreleased_section(lines)
    start, end = find_section(lines, UNRELEASED_HEADER)
    existing_entries = [line for line in lines[start + 1 : end] if line.strip() and line.strip() != PLACEHOLDER]

    if entry not in existing_entries:
        existing_entries.append(entry)

    new_section = build_unreleased_section(existing_entries)
    lines = lines[:start] + new_section + lines[end:]
    write_lines(lines)


def promote_unreleased_to_release(message: str) -> str:
    lines = read_lines()
    lines = ensure_unreleased_section(lines)
    start, end = find_section(lines, UNRELEASED_HEADER)

    section_entries = [line for line in lines[start + 1 : end] if line.strip() and line.strip() != PLACEHOLDER]
    if not section_entries:
        summary = message.splitlines()[0].strip() or "No details provided"
        section_entries = [f"- {summary}"]

    current_version = extract_current_version(lines)
    new_version = bump_patch(current_version)
    version_string = f"v{new_version[0]}.{new_version[1]}.{new_version[2]}"
    date_string = datetime.now().strftime("%Y-%m-%d")

    replacement = build_unreleased_section([]) + [f"## [{version_string}] - {date_string}", *section_entries, ""]
    lines = lines[:start] + replacement + lines[end:]
    write_lines(lines)
    return version_string


def main() -> None:
    parser = argparse.ArgumentParser(description="Automate CHANGELOG updates.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    pipeline_parser = subparsers.add_parser("pipeline", help="Record a pipeline run under Unreleased")
    pipeline_parser.add_argument("--message", required=True, help="Summary of the pipeline action")

    release_parser = subparsers.add_parser("release", help="Promote Unreleased changes to a new version")
    release_parser.add_argument("--message", required=True, help="Commit message used as fallback entry")

    args = parser.parse_args()

    if args.command == "pipeline":
        append_unreleased_entry(args.message)
    elif args.command == "release":
        new_version = promote_unreleased_to_release(args.message)
        print(f"Updated CHANGELOG to {new_version}")


if __name__ == "__main__":
    try:
        main()
    except ChangelogError as exc:  # pragma: no cover - developer feedback
        raise SystemExit(f"CHANGELOG update failed: {exc}")
