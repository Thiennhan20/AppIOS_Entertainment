const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Undo my terrible specific string replacement that left hanging `, useEffect } from 'react';`
  // Actually, I can just find the broken lines.
  const lines = content.split('\n');
  let fixedLines = [];
  let needsTranslation = false;
  
  for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.includes("t('")) needsTranslation = true;
      
      // Fix broken imports
      if (line.includes("import React, { useState } from 'react';")) {
          // If the next line has the broken `, useEffect } from 'react';`
          if (lines[i+1] && lines[i+1].includes("import { useTranslation } from 'react-i18next';, ")) {
              const remaining = lines[i+1].replace("import { useTranslation } from 'react-i18next';, ", "");
              // remaining is like "useEffect } from 'react';"
              line = "import React, { useState, " + remaining;
              i++; // skip next line
          } else if (lines[i+1] && lines[i+1].includes("import { useTranslation } from 'react-i18next'; } from 'react';")) {
              line = "import React, { useState } from 'react';";
              i++; 
          }
      }
      fixedLines.push(line);
  }
  
  content = fixedLines.join('\n');
  
  // Fix the other broken ones
  content = content.replace(/import \{ useTranslation \} from 'react-i18next';, /g, "");
  content = content.replace(/import \{ useTranslation \} from 'react-i18next'; \} from 'react';/g, "");
  
  // Just ensure useTranslation exists at top if needed
  if (content.includes("t('") && !content.includes("useTranslation")) {
      // Find last import
      let lastImportIndex = 0;
      const linesArray = content.split('\n');
      for (let j = 0; j < linesArray.length; j++) {
          if (linesArray[j].startsWith("import ")) {
              lastImportIndex = j;
          }
      }
      linesArray.splice(lastImportIndex + 1, 0, "import { useTranslation } from 'react-i18next';");
      content = linesArray.join('\n');
  }
  
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed imports');
