#!/bin/bash
START_DATA=$(echo $1 | jq -r '.startData')
MESSAGE=$(echo $START_DATA | jq -r '.message')

if [ "${MESSAGE}" = "null" ]; then
  exit 1
else
  echo "BUSYBEE_RETURN ${MESSAGE}"
fi