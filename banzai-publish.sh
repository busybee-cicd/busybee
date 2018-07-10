#!/bin/bash

echo "building documentation"
git fetch origin
git checkout -b gh-pages origin/gh-pages
git merge master
npm run docs
git add .
git commit -m 'documentation updated'
git push origin gh-pages