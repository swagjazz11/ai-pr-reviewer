# 🤖 AI PR Reviewer

A GitHub App that automatically reviews pull requests using an LLM and posts **inline comments** on the exact lines that have bugs, security issues, or risky code.

<!-- Add a demo GIF here: ![demo](docs/demo.gif) -->

## How it works

```
Pull request opened/updated
        │  (webhook)
        ▼
  Probot server ──► fetch changed files (diff)
        │
        ▼
  Annotate diff with line numbers ──► LLM (JSON review)
        │
        ▼
  Validate lines ──► post inline review comments on the PR
```

Key details:
- The diff is annotated with new-file line numbers so the model can point to exact lines.
- Every comment is validated against lines that really exist in the diff; anything else goes into the summary instead of failing the review.
- Lock files, minified files, images, and `dist/` are skipped. Large files are truncated.
- Per-repo settings live in `.github/aireview.yml`.

## Tech stack
Node.js · Probot · GitHub REST API · any OpenAI-compatible LLM API (Groq by default) · Docker

## Setup

### 1. Get a free LLM key
Create a key at https://console.groq.com (free tier). Any OpenAI-compatible provider works via `LLM_BASE_URL` and `LLM_MODEL`.

### 2. Create the GitHub App
GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**

- **Webhook URL:** your smee.io channel URL (local) or your deployed URL
- **Webhook secret:** any string (reuse in `.env`)
- **Repository permissions:** Pull requests: *Read & write* · Contents: *Read-only* · Metadata: *Read-only*
- **Subscribe to events:** *Pull request*
- Create it, note the **App ID**, and **generate a private key** (`.pem` file)

### 3. Run locally
```bash
git clone https://github.com/<you>/ai-pr-reviewer && cd ai-pr-reviewer
npm install
cp .env.example .env     # fill in APP_ID, WEBHOOK_SECRET, LLM_API_KEY, WEBHOOK_PROXY_URL
# put your downloaded key at ./private-key.pem
npm start
```
Create a free channel at https://smee.io and use its URL as `WEBHOOK_PROXY_URL` and as the app's webhook URL.

### 4. Install and test
Install the app on a **demo repo** (GitHub App → Install App). Open a PR containing `demo/bad_code.js` and the bot will comment within seconds.

### 5. Deploy (Render / Railway / Fly.io)
Use the included `Dockerfile`. Set the env vars from `.env.example` (put the key contents in `PRIVATE_KEY`). Then set the GitHub App webhook URL to your deployed URL.

## Configuration
`.github/aireview.yml` in the reviewed repo:
```yaml
enabled: true
strictness: normal   # low | normal | high
max_files: 15
ignore: ["**/*.min.js", "dist/**"]
```

## Tests
```bash
npm test
```

## Roadmap
- Review only the newly pushed commits on `synchronize`
- Respond to `@bot review` comments
- Dashboard of past reviews
- Custom team rules via config

## License
MIT
