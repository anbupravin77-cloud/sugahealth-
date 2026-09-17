// We don't have Firefox, but let's test node's exact error message.
try {
  const { a } = undefined;
} catch (e) {
  console.log("const:", e.message);
}
try {
  (function({a}){})();
} catch (e) {
  console.log("param:", e.message);
}
