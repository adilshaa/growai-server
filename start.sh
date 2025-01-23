#!/bin/bash
source /opt/venv/bin/activate
export PORT="${PORT:-5500}"
python3 app.py &
node index.js