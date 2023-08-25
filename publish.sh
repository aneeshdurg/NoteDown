#!/usr/bin/bash
set -ex
rm -rf dist
npm run build
sed -f fix.sed index.html > dist/index.html
cp src/style.css dist/
cd dist
git init
git remote add origin 'https://github.com/aneeshdurg/NoteDown.git'
git checkout -b gh-pages
git add .
git commit -m "deploy"
git push -f origin gh-pages
