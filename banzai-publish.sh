#!/bin/bash

echo "building documentation"
source /var/jenkins_home/.nvm/nvm.sh
nvm use 8
git config --global user.email "Service.SweeneyJenkins@ge.com"
git config --global user.name "Sweeny Jenkins"
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch origin
#git checkout gh-pages origin/gh-pages
git checkout gh-pages
git merge master
npm run docs
git add .
git commit -m 'documentation updated'
git push origin gh-pages