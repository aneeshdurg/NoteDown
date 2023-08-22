#!/usr/bin/bash
rm -rf dist
npm run build
sed 's/src\/main.ts/note-down.js' index.html > dist/index.html
cd dist
git init
git remote add origin 'https://github.com/aneeshdurg/NoteDown.git'
git checkout -b gh-pages
git add .
git commit -m "deploy"
git push -f origin gh-pages
