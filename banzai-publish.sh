#!/bin/bash

echo "building documentation"
git fetch origin
git checkout gh-pages
git merge master
npm run docs
git add .
git commit -m 'documentation updated'
git push origin gh-pages