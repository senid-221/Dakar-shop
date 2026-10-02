#!/usr/bin/env bash
# Restart the local function harness (dev-only process owned by this project).
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.qoder/tools/node22/node-v22.23.3-win-x64:$PATH"
PID=$(netstat -ano | grep ":8000" | grep LISTENING | awk '{print $5}' | head -1)
if [ -n "$PID" ]; then taskkill //PID "$PID" //F >/dev/null; sleep 0.5; fi
(node dev/server.mjs 8000 &>/tmp/fnserver.log &)
sleep 1.2
curl -s -o /dev/null -w "harness: %{http_code}\n" http://127.0.0.1:8000/functions/v1/app
