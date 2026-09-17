const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("src");
files.forEach(f => {
  const content = fs.readFileSync(f, "utf8");
  // match arrow functions with destructuring
  const regex = /(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(\s*(\{([^}]+)\}\s*(?::\s*[^)]+)?)\s*\)\s*=>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!match[2].includes("="))
      console.log(`Arrow: ${f} -> ${match[1]} (${match[2]})`);
  }
  
  // match standard functions with destructuring
  const regex2 = /function\s+([a-zA-Z0-9_]+)\s*\(\s*(\{([^}]+)\}\s*(?::\s*[^)]+)?)\s*\)/g;
  let match2;
  while ((match2 = regex2.exec(content)) !== null) {
    if (!match2[2].includes("="))
      console.log(`Function: ${f} -> ${match2[1]} (${match2[2]})`);
  }
});
