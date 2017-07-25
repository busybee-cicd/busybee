#!/bin/bash
PORT=$1 docker stack deploy -c stack.yml stack-$2
./wait-for-it.sh -q localhost:$1 -- echo "ready"
