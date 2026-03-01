import * as core from '@actions/core'
import * as github from '@actions/github'

interface RefinedItem {
  problem?: string
  acceptanceCriteria?: string[]
  assumptions?: string[]
  estimate?: string
  priority?: string
  tags?: string[]
}

interface ScoreItem {
  completeness_score?: number
}

interface RefineResponse {
  items: RefinedItem[]
  scores?: ScoreItem[]
}

async function run() {
  const apiKey = core.getInput('api-key', { required: true })
  const threshold = parseInt(core.getInput('threshold') || '70')
  const baseUrl = core.getInput('base-url') || 'https://refinebacklog.com'

  const context = github.context
  const issue = context.payload.issue

  if (!issue) {
    core.info('No issue found in context, skipping')
    return
  }

  const issueText = `${issue.title}\n\n${issue.body || ''}`

  // Call Speclint API
  const response = await fetch(`${baseUrl}/api/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-license-key': apiKey,
      'x-source': 'github-action',
    },
    body: JSON.stringify({ items: [issueText] }),
  })

  if (!response.ok) {
    const error = await response.text()
    core.setFailed(`Speclint API error: ${response.status} — ${error}`)
    return
  }

  const data = await response.json() as RefineResponse
  const refined = data.items[0]
  const score = data.scores?.[0]

  // Build comment
  const comment = buildComment(refined, score, threshold)

  // Post comment
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN!)
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issue.number,
    body: comment,
  })

  // Add labels
  const completenessScore = score?.completeness_score ?? 0
  const agentReady = completenessScore >= threshold
  const labelToAdd = agentReady ? 'agent_ready' : 'needs-refinement'

  try {
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: [labelToAdd],
    })
  } catch {
    core.warning('Could not add label — ensure the label exists in your repo')
  }

  // Set outputs
  core.setOutput('completeness-score', String(completenessScore))
  core.setOutput('agent-ready', String(agentReady))

  core.info(`✅ Speclint complete. Score: ${completenessScore}/100. Agent ready: ${agentReady}`)
}

function buildComment(refined: RefinedItem, score: ScoreItem | undefined, threshold: number): string {
  const completenessScore = score?.completeness_score ?? 0
  const agentReady = completenessScore >= threshold
  const filled = Math.round(completenessScore / 10)
  const scoreBar = '█'.repeat(filled) + '░'.repeat(10 - filled)

  const acs = refined?.acceptanceCriteria ?? []
  const assumptions = refined?.assumptions ?? []
  const tags = refined?.tags ?? []

  return `## 🔍 Speclint Analysis

**Completeness Score:** ${completenessScore}/100 ${agentReady ? '✅ Agent Ready' : '⚠️ Needs Refinement'}
\`${scoreBar}\`

---

### 📋 Refined Spec

**Problem:** ${refined?.problem ?? '—'}

**Acceptance Criteria:**
${acs.map((ac: string) => `- [ ] ${ac}`).join('\n')}

${assumptions.length > 0 ? `**Assumptions to Clarify:**\n${assumptions.map((a: string) => `- ❓ ${a}`).join('\n')}\n` : ''}
**Estimate:** ${refined?.estimate ?? '—'} | **Priority:** ${refined?.priority ?? '—'}
**Tags:** ${tags.map((t: string) => `\`${t}\``).join(' ')}

---
<sub>Powered by [Speclint](https://speclint.ai) — lint your specs before agents touch them</sub>`
}

run().catch(core.setFailed)
