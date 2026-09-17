try {
  (function({a} = {}){})(null);
} catch (e) {
  console.log("with null:", e.message);
}
