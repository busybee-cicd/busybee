#!/bin/bash
ENV_ID=$(echo "$1" | jq -r ".generatedEnvID")
HOST=$(echo "$1" | jq -r ".hostName")
API_PORT=$(echo "$1" | jq -r ".ports[0]")
BUSYBEE_DIR=$(echo "$1" | jq -r ".busybeeDir")

###
# spin up mock REST server in the background
###
mockserver -p $API_PORT -m "${BUSYBEE_DIR}"/mock-responses &
MOCK_SERVER_PID=$!
sleep 10
echo "BUSYBEE_RETURN ${MOCK_SERVER_PID}"