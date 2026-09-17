const fs = require("fs");
let content = fs.readFileSync("src/main.tsx", "utf8");

const patch = `
const originalError = console.error;
console.error = function(...args) {
  originalError.apply(console, args);
  if (args[0] && args[0].message && args[0].message.includes("destructured parameter")) {
    console.log("=== EXACT STACK TRACE ===");
    console.log(args[0].stack || args[1]?.stack || new Error().stack);
  }
};
`;

if (!content.includes("EXACT STACK TRACE")) {
  fs.writeFileSync("src/main.tsx", patch + content);
}
console.log("main.tsx patched with stack dumper");
