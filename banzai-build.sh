#!/bin/bash

echo "Prerequisite: Ensure correct Node version"
npm config set proxy "http://iss-americas-pitc-cincinnatiz.proxy.corporate.ge.com:80"
npm config set https-proxy "http://iss-americas-pitc-cincinnatiz.proxy.corporate.ge.com:80"
npm install -g mockserver;

echo "Installing Dependencies"
npm install
echo "Running Unit Tests" 
npm test
echo "Running IT"
npm run IT
