/* global process */
import fs from 'fs';
import path from 'path';

const CSS_DIR = path.join(process.cwd(), 'src');

function getAllCssFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllCssFiles(fullPath));
    } else if (file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

function optimizeCss() {
  const cssFiles = getAllCssFiles(CSS_DIR);
  let changedFiles = 0;

  cssFiles.forEach((filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Replace `transition: all <time> <easing>` with targeted GPU properties
    const transitionRegex = /transition:\s*all\s+([^;]+);/g;
    if (transitionRegex.test(content)) {
      content = content.replace(transitionRegex, (match, timeAndEasing) => {
        return `transition: background-color ${timeAndEasing}, border-color ${timeAndEasing}, color ${timeAndEasing}, opacity ${timeAndEasing}, transform ${timeAndEasing}, box-shadow ${timeAndEasing};`;
      });
      hasChanges = true;
    }

    // Add will-change and hardware acceleration to key heavy elements
    const heavySelectorsRegex = /(\.habit-row|\.modal-content|\.glass-3d)[^{]*\{([^}]+)\}/g;
    if (heavySelectorsRegex.test(content)) {
      content = content.replace(heavySelectorsRegex, (match, selector, block) => {
        if (!block.includes('will-change')) {
          const acceleratedBlock = block.replace(/^\s*/m, (m) => `${m}  will-change: transform, opacity;\n  transform: translateZ(0);\n${m}`);
          return match.replace(block, acceleratedBlock);
        }
        return match;
      });
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      changedFiles++;
    }
  });

  console.log(`Optimized ${changedFiles} CSS files.`);
}

optimizeCss();
