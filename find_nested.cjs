const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    if (fs.statSync(file).isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
  });
  return results;
}

const files = walk('src');
files.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    traverse(ast, {
      ObjectPattern(path) {
        if (path.parentPath.isObjectProperty()) {
            console.log(`${f}: Nested object pattern at line ${path.node.loc.start.line}`);
        }
      }
    });
  } catch(e) {}
});
