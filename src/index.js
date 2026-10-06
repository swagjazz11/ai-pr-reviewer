const { annotatePatch, isIgnored } = require("./diff");
const { askLLM } = require("./llm");

const DEFAULTS = {
  enabled: true,
  strictness: "normal", // low | normal | high
  max_files: 15,
  max_chars_per_file: 6000,
  ignore: ["package-lock.json", "yarn.lock", "**/*.min.js", "dist/**", "node_modules/**", "**/*.png", "**/*.svg"],
};

const ICONS = { bug: "🔴 Bug", security: "🛡️ Security", warning: "🟡 Warning", suggestion: "🔵 Suggestion" };

module.exports = (app) => {
  app.on(["pull_request.opened", "pull_request.synchronize", "pull_request.ready_for_review"], async (context) => {
    const pr = context.payload.pull_request;
    if (pr.draft || pr.user.type === "Bot") return;

    const config = { ...DEFAULTS, ...((await context.config("aireview.yml")) || {}) };
    if (!config.enabled) return;

    const { data: files } = await context.octokit.pulls.listFiles({
      ...context.pullRequest(),
      per_page: 100,
    });

    const reviewable = files
      .filter((f) => f.patch && f.status !== "removed" && !isIgnored(f.filename, config.ignore))
      .slice(0, config.max_files);

    if (reviewable.length === 0) {
      app.log.info("No reviewable files");
      return;
    }

    const validByFile = {};
    const chunks = reviewable.map((f) => {
      const { text, validLines } = annotatePatch(f.patch.slice(0, config.max_chars_per_file));
      validByFile[f.filename] = validLines;
      return `FILE: ${f.filename}\n${text}`;
    });

    let review;
    try {
      review = await askLLM(chunks.join("\n\n"), { strictness: config.strictness });
    } catch (err) {
      app.log.error(err);
      return;
    }

    const inline = [];
    const leftover = [];
    for (const c of review.comments || []) {
      const body = `**${ICONS[c.severity] || "💬 Note"}**\n\n${c.comment}`;
      if (validByFile[c.file] && validByFile[c.file].has(Number(c.line))) {
        inline.push({ path: c.file, line: Number(c.line), side: "RIGHT", body });
      } else {
        leftover.push(`- \`${c.file}\`: ${c.comment}`);
      }
    }

    let summary = `## 🤖 AI Code Review\n\n${review.summary || "Review complete."}`;
    summary += `\n\n_Reviewed ${reviewable.length} file(s) · ${inline.length} inline comment(s)_`;
    if (leftover.length) summary += `\n\n**Other notes:**\n${leftover.join("\n")}`;

    try {
      await context.octokit.pulls.createReview({
        ...context.pullRequest(),
        body: summary,
        event: "COMMENT",
        comments: inline,
      });
    } catch (err) {
      // If any inline position is rejected, fall back to a single summary comment.
      app.log.warn(`Inline review failed (${err.message}); posting summary only`);
      const fallback = inline.map((c) => `- \`${c.path}:${c.line}\` ${c.body.replace(/\n+/g, " ")}`).join("\n");
      await context.octokit.issues.createComment(
        context.issue({ body: `${summary}\n\n${fallback}` })
      );
    }
  });
};
