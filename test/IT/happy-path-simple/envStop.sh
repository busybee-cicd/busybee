#!/bin/bash
ENV_ID=$(echo $1 | jq -r '.generatedEnvID')
HOST=$(echo $1 | jq -r '.hostName')
API_PORT=$(echo $1 | jq -r '.ports[0]')
BUSYBEE_DIR=$(echo $1 | jq -r '.busybeeDir')
MOCK_SERVER_PID=$(echo $1 | jq -r '.startScriptReturnData')

echo "killing process $MOCK_SERVER_PID"
kill -SIGTERM $MOCK_SERVER_PID
exit 0