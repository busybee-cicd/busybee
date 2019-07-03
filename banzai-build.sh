#!/bin/bash

echo "Prerequisite: Ensure correct Node version"
npm install -g mockserver;

echo "Installing Dependencies"
npm install
echo "Running Unit Tests" 
npm test
echo "Running IT"
npm run IT
