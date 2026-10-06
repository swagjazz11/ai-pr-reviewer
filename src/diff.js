// Turns a unified-diff patch into text with explicit new-file line numbers,
// and records which line numbers GitHub will accept for inline comments.
function annotatePatch(patch) {
  const validLines = new Set();
  const out = [];
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = parseInt(hunk[1], 10);
      out.push(raw);
      continue;
    }
    if (raw.startsWith("\\")) continue; // "\ No newline at end of file"
    if (raw.startsWith("+")) {
      validLines.add(newLine);
      out.push(`L${newLine}: ${raw}`);
      newLine++;
    } else if (raw.startsWith("-")) {
      out.push(`     ${raw}`);
    } else {
      validLines.add(newLine);
      out.push(`L${newLine}: ${raw}`);
      newLine++;
    }
  }
  return { text: out.join("\n"), validLines };
}

// Minimal glob matcher: supports *, ** and ?
function globToRegExp(glob) {
  const esc = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${esc}$`);
}

function isIgnored(filename, patterns = []) {
  return patterns.some((p) => globToRegExp(p).test(filename));
}

module.exports = { annotatePatch, globToRegExp, isIgnored };
