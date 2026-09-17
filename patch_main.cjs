const fs = require("fs");
let content = fs.readFileSync("src/main.tsx", "utf8");

const patch = `
window.addEventListener("error", (event) => {
  console.error("GLOBAL ERROR CAUGHT:", event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("GLOBAL PROMISE REJECTION:", event.reason);
});
`;

if (!content.includes("GLOBAL ERROR CAUGHT")) {
  fs.writeFileSync("src/main.tsx", patch + content);
}
console.log("main.tsx patched");
