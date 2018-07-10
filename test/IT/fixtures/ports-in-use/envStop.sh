#!/bin/bash
ENV_ID=$(echo $1 | jq -r '.generatedEnvID')
HOST=$(echo $1 | jq -r '.hostName')
API_PORT=$(echo $1 | jq -r '.ports[0]')
BUSYBEE_DIR=$(echo $1 | jq -r '.busybeeDir')
MOCK_SERVER_PID=$(echo $1 | jq -r '.startScriptReturnData')
ERROR_DATA=$(echo $1 | jq -r '.startScriptErrorData')

if [ "${ERROR_DATA}" = "null" ]; then
  echo "stopping env that started successfully"
  echo "killing process $MOCK_SERVER_PID"
  kill -SIGTERM $MOCK_SERVER_PID
  exit 0
else
  echo "killing process due to ${ERROR_DATA}"
fi