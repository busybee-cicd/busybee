#!/bin/bash
ENV_ID=$(echo "$1" | jq -r ".generatedEnvID")
HOST=$(echo "$1" | jq -r ".hostName")
API_PORT=$(echo "$1" | jq -r ".ports[0]")
BUSYBEE_DIR=$(echo "$1" | jq -r ".busybeeDir")

###
# spin up mock REST server in the background
###
#exec 3< <(mockserver -p $API_PORT -m "${BUSYBEE_DIR}"/mock-responses)
mockserver -p $API_PORT -m "${BUSYBEE_DIR}"/mock-responses &
MOCK_SERVER_PID=$!

while [[ "$(curl -s -o /dev/null -w ''%{http_code}'' ${HOST}:${API_PORT}/200)" != "200" ]]; do sleep 5; done

# URL="http://${HOST}:${PORT}/200"
# until $(curl --output /dev/null --silent --head --fail $URL); do
#     printf 'waiting for mockserver...'
#     sleep 2
# done
echo "BUSYBEE_RETURN ${MOCK_SERVER_PID}"