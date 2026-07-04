#!/usr/bin/env bash
# Webdevful boilerplate -> product repo creator.
#
# This is the documented entry point referenced by the factory docs and the LPF
# launch-root AGENTS.md:
#   bash /Volumes/WDF-NAS-01/06-Templates/Boilerplates/webdevful-astro-boilerplate/tools/create_from_boilerplate.sh <target-dir>
#
# It is a thin, stable wrapper that delegates to the canonical NAS seed copier so
# there is exactly one create-product implementation to maintain.
set -euo pipefail

CANONICAL_CREATOR="/Volumes/WDF-NAS-01/01-WOS/Agent-System/Tooling/Boilerplate/create_product_from_official_seed.sh"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <target-dir>" >&2
  exit 1
fi

if [ ! -f "$CANONICAL_CREATOR" ]; then
  echo "Canonical seed copier missing: $CANONICAL_CREATOR" >&2
  echo "Restore it before creating product repos." >&2
  exit 1
fi

exec bash "$CANONICAL_CREATOR" "$1"
