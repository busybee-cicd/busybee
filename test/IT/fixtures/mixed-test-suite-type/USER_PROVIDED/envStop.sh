#!/bin/bash
STOP_DATA=$(echo $1 | jq -r '.stopData')
MESSAGE=$(echo $STOP_DATA | jq -r '.message')

if [ "${MESSAGE}" = "null" ]; then
  exit 1
else
  echo "BUSYBEE_RETURN ${MESSAGE}"
fi