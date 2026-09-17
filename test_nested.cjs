const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ast = parser.parse("function myFunc({a: {b}}) {}", {sourceType: 'module'});
traverse(ast, {
  ObjectPattern(path) {
    if (path.parentPath.isFunction()) {
       console.log("Found function param pattern!");
    } else {
       console.log("Found nested pattern! parent is", path.parentPath.node.type);
    }
  }
});
