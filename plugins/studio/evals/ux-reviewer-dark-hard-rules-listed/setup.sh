#!/bin/bash
# Copies the screenshot and the cited reference library next to the run so the reviewer can Read them. Needs --scaffold.
here="$(dirname "$0")"
cp "$here"/*.png .
mkdir -p refs && cp "$here"/../../../../docs/references/ux/*.md refs/ 2>/dev/null || cp "$here"/refs/*.md refs/ 2>/dev/null
