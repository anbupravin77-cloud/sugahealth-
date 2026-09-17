try {
  (function({a} = {}){})();
} catch (e) {
  console.log("with default:", e.message);
}
try {
  (function({a} = {a: 1}){})();
} catch (e) {
  console.log("with full default:", e.message);
}
