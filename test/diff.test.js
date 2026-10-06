const test = require("node:test");
const assert = require("node:assert");
const { annotatePatch, isIgnored } = require("../src/diff");
const { extractJson } = require("../src/llm");

const patch = `@@ -1,3 +10,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
 module.exports = a;`;

test("annotatePatch numbers new-file lines", () => {
  const { text, validLines } = annotatePatch(patch);
  assert.ok(text.includes("L10:  const a = 1;"));
  assert.ok(text.includes("L11: +const b = 3;"));
  assert.ok(text.includes("L12: +const c = 4;"));
  assert.deepStrictEqual([...validLines], [10, 11, 12, 13]);
});

test("removed lines are not valid comment targets", () => {
  const { text } = annotatePatch(patch);
  assert.ok(text.includes("-const b = 2;"));
  assert.ok(!text.includes("L11: -"));
});

test("isIgnored matches globs", () => {
  assert.ok(isIgnored("package-lock.json", ["package-lock.json"]));
  assert.ok(isIgnored("src/app.min.js", ["**/*.min.js"]));
  assert.ok(isIgnored("dist/a/b.js", ["dist/**"]));
  assert.ok(!isIgnored("src/app.js", ["**/*.min.js", "dist/**"]));
});

test("extractJson handles fenced and noisy output", () => {
  assert.deepStrictEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepStrictEqual(extractJson('Here you go: {"a":2} thanks'), { a: 2 });
});
