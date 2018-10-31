#!/bin/bash
RUN_DATA=$(echo $1 | jq -r '.runData')
MESSAGE=$(echo $RUN_DATA | jq -r '.message')

# make sure MY_ENV_VAR is set on this process
echo $MY_ENV_VAR

if [ "${MESSAGE}" = "null" ]; then
  exit 1
else
  echo "BUSYBEE_RETURN ${MESSAGE}"
fi