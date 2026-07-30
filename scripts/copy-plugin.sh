#!/bin/bash
set -e

cd "$(dirname "$0")"
PLUGIN_DIR="./obsidian-knowledge-graph-plugin"

echo "Cleaning plugin directory..."
mkdir -p "$PLUGIN_DIR"
rm -rf "$PLUGIN_DIR"/*

echo "Copying main files..."
cp main.js main.js.map styles.css manifest.json "$PLUGIN_DIR"/

echo "Copying subdirectories..."
for dir in ui models services verification; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$PLUGIN_DIR"/
    fi
done

echo "✅ Plugin copied successfully!"
ls -la "$PLUGIN_DIR"/
