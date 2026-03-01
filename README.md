# Speclint GitHub Action

Automatically lint your GitHub issues for spec completeness before AI coding agents touch them — powered by [Speclint](https://speclint.ai).

## What it does

Speclint analyzes every new or edited GitHub issue, scores it for completeness (0–100), posts a structured refined spec as a comment, and labels the issue as `agent_ready` or `needs-refinement` so your AI agents know whether to proceed.

## Quick Start

**Step 1 — Copy the workflow into your repo:**

Create `.github/workflows/speclint.yml`:

```yaml
name: Speclint
on:
  issues:
    types: [opened, edited]

jobs:
  speclint:
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - uses: speclint-ai/speclint-action@v1
        with:
          api-key: ${{ secrets.SPECLINT_API_KEY }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2 — Add your API key secret:**

1. Go to your repo → Settings → Secrets and variables → Actions
2. Click **New repository secret**
3. Name: `SPECLINT_API_KEY`, Value: your key from [speclint.ai/get-key](https://speclint.ai/get-key)

**Step 3 — Create the labels in your repo:**

```bash
gh label create agent_ready --color 0075ca --description "Issue is complete and ready for AI agents"
gh label create needs-refinement --color e4e669 --description "Issue needs more detail before agents can work on it"
```

That's it. Open any issue and Speclint will analyze it within seconds.

---

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api-key` | ✅ Yes | — | Your Speclint API key from [speclint.ai/get-key](https://speclint.ai/get-key) |
| `threshold` | No | `70` | Minimum completeness score (0–100) to add the `agent_ready` label |
| `base-url` | No | `https://refinebacklog.com` | API base URL (override for testing) |

## Outputs

| Output | Description |
|--------|-------------|
| `completeness-score` | The completeness score (0–100) of the refined spec |
| `agent-ready` | Whether the issue passed the threshold (`true` or `false`) |

---

## How it works

1. Fires on `issues.opened` and `issues.edited`
2. Sends the issue title + body to the Speclint API
3. Posts a structured comment with:
   - Completeness score + visual bar
   - Refined problem statement
   - Acceptance criteria (checkboxes)
   - Assumptions to clarify
   - Estimate, priority, and tags
4. Adds `agent_ready` label if score ≥ threshold, otherwise `needs-refinement`

---

## Example comment

```
## 🔍 Speclint Analysis

**Completeness Score:** 82/100 ✅ Agent Ready
`████████░░`

---

### 📋 Refined Spec

**Problem:** Users cannot reset their password when they've forgotten it, blocking access to the app.

**Acceptance Criteria:**
- [ ] User can request a password reset email from the login screen
- [ ] Reset link expires after 24 hours
- [ ] User is redirected to login after successful reset

**Estimate:** S | **Priority:** High
**Tags:** `auth` `ux` `backend`

---
Powered by Speclint — lint your specs before agents touch them
```

---

## Get an API key

→ [speclint.ai/get-key](https://speclint.ai/get-key)

Built by [Perpetual Agility LLC](https://perpetualagility.com)
