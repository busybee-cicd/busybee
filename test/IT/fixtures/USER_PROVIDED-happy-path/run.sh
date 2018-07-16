#!/bin/bash
RUN_DATA=$(echo $1 | jq -r '.runData')
MESSAGE=$(echo $RUN_DATA | jq -r '.message')

if [ "${MESSAGE}" = "null" ]; then
  exit 1
else
  echo "BUSYBEE_RETURN ${MESSAGE}"
fi