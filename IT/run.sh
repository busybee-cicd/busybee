#!/bin/bash

RESULTS=()
RED=$(echo -en '\033[00;31m')
GREEN=$(echo -en '\033[00;32m')
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# execute the simple happy path
node ${SCRIPT_DIR}/../dist/src/index.js test -d ${SCRIPT_DIR}/happy-path-simple -D
HAPPY_PATH_SIMPLE_RESULT=$? # should be 0
if [ $HAPPY_PATH_SIMPLE_RESULT = 0 ]; then
    RESULTS+=("${GREEN}PASS: happy-path-simple")
else
    RESULTS+=("${RED}FAIL: happy-path-simple")
fi

# execute failed startScript


###
# Print Results
###
for var in "${RESULTS[@]}"
do
  echo "${var}"
done