#!/bin/bash
# Copies the screenshots next to the run so the reviewer can Read them. Needs --scaffold.
for f in "$(dirname "$0")"/*.png; do cp "$f" .; done
