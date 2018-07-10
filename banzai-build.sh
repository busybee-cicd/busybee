#!/bin/bash

echo "Prerequisite: Ensure correct Node version"
source /var/jenkins_home/.nvm/nvm.sh
nvm use 8

echo "Running Unit Tests" 
npm test
echo "Running IT"
npm run IT