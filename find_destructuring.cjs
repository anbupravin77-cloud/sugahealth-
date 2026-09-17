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
        if (path.parentPath.isFunction() || path.parentPath.isArrowFunctionExpression()) {
          // See if it has an assignment pattern wrapper
          const isAssignment = path.parentPath.node.params.some(p => p.type === 'AssignmentPattern' && p.left === path.node);
          if (!isAssignment) {
             const name = path.parentPath.node.id ? path.parentPath.node.id.name : 'anonymous';
             console.log(`${f}: function ${name} at line ${path.node.loc.start.line} has no default`);
          }
        }
      }
    });
  } catch(e) {
    console.error("Error parsing", f, e.message);
  }
});
