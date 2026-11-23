#!/bin/bash
# Copies the screenshot next to the run so the reviewer can Read it. Needs --scaffold.
for f in "$(dirname "$0")"/*.png; do cp "$f" .; done
