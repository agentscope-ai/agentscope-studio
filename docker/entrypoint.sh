#!/bin/sh
# Docker entrypoint script

# Create Friday config if not exists
FRIDAY_CONFIG="/app/data/AgentScope-Studio/Friday/config.json"

if [ ! -f "$FRIDAY_CONFIG" ]; then
    echo "Creating default Friday config..."
    mkdir -p "$(dirname "$FRIDAY_CONFIG")"
    echo '{"pythonEnv":"/usr/local/bin/python3","llmProvider":"","modelName":"","writePermission":false}' > "$FRIDAY_CONFIG"
fi

# Start the application
exec node dist/server/src/index.js
