#!/bin/bash

echo "Prerequisite: Ensure correct Node version"
source /var/jenkins_home/.nvm/nvm.sh
nvm use 8
npm config set proxy "http://iss-americas-pitc-cincinnatiz.proxy.corporate.ge.com:80"
npm config set https-proxy "http://iss-americas-pitc-cincinnatiz.proxy.corporate.ge.com:80"

command -v yarn >/dev/null 2>&1 || {
    echo "Installing Yarn..."
    npm install -g yarn;
}

echo "Installing Dependencies"
yarn install
echo "Running Unit Tests" 
npm test
echo "Running IT"
npm run IT