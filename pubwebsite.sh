#!/bin/bash

# This script is used to publish the website
# since the website depends on all local links
# it first pulls the dependencies.
#
# After that it asks whether to publish the website
# if yes then it pushes the contents of `./website`
# to the `gh-pages` branch of this repo.

# abort on errors
set -e

cp npm/esm/solutions.js website/

cd website

# Ask whether to publish the website
read -p "Publish the website? [y/n]: " choice
if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
  git init
  git add -A
  git commit -m 'publish website'
  git push -f git@github.com:chadkirby/liqueur-solutions.git main:gh-pages

  rm -rf .git
fi


cd -
