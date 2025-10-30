#!/usr/bin/env bash
set -euo pipefail

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Not inside a git repository" >&2
  exit 1
}

git config core.hooksPath scripts/git-hooks

echo "Git hooks installed. Future commits will auto-update CHANGELOG.md"
