---
title: Everything I Learned From My Claude Code Training
published: false
description: Notes from a hands-on Claude Code training session — the agentic loop, models, sessions, CLAUDE.md, permissions, commands vs skills vs agents, hooks, MCP, and multi-agent workflows.
tags: ai, claudecode, productivity, devtools
---

# Everything I Learned From My Claude Code Training

I recently went through a hands-on training on **Claude Code** and the broader Claude ecosystem. Below are my full notes, cleaned up and organized by topic — covering the agentic loop, model selection, session management, project configuration, commands vs. skills vs. agents, hooks, MCP, and multi-agent workflows.

---

## 1. The Claude Ecosystem

Claude Code is one tool within a larger ecosystem, not a standalone product:

- **Claude AI** — the conversational assistant
- **Claude Code** — the agentic coding CLI (the focus of this article)
- **Claude Design** — design tooling
- **Claude Co-work** — collaboration tooling
- **Claude Security** — security-focused tooling
- **Claude Chrome plugin** — browser automation
- **Claude Office plugin** — office document integration

In the backend, Claude Code talks to the LLM hosted by Anthropic via the `/v1/messages` API.

Tools like Cursor, Windsurf, and Perplexity act as **integrators** — giving access to multiple LLMs. Claude, by contrast, offers an entire vertically integrated ecosystem.

---

## 2. The Agentic Loop (Query Engine)

This is the core engine behind Claude Code. Given a request — e.g. *"Create a unit test case for my function"* — the loop works like this:

1. **Gather context** — reads the target file, its imports, and any functions that need to be mocked.
2. **Send context to the LLM** — the LLM decides what actions are needed based on everything gathered (e.g. "create a new test case").
3. **Use tools** — Claude Code creates or modifies files using its tool system.
4. **Verify** — the agent checks whether the job is actually done (e.g. runs the test to confirm it passes).

Key properties:

- The loop **runs continuously** until the task is complete.
- The **user can modify context** mid-loop or after it.
- Everything depends on **which LLM is being used** — model choice matters.

Claude Code has:

- An **agentic loop** that loops until the task is completed
- A **tool system**: git, bash, read, write files
- A **permission pipeline**, configurable per tool (Allow / Deny / Ask)
- A **context manager**: compaction and pruning of context within a session
- **Session persistence**: work can be paused and resumed later, with context and memory maintained

---

## 3. Models, Effort, and Slash Commands

### Models

Four main models, chosen based on task type and usage:

| Model | Best for |
|---|---|
| **Fable** | Complex tasks — architecture, design, security, coding |
| **Opus** | High-capability general tasks |
| **Sonnet** | Balanced, everyday tasks |
| **Haiku** | Simple, fast tasks |

- `Qwen-local` is the local-model equivalent of Haiku.
- `opusplan` = Opus for planning + Sonnet for execution.

**Guidance:** try a smaller model at higher effort first — only switch to a larger model if it can't handle the task. Use Fable only if Opus can't handle it.

### Effort

`/effort` controls how much effort the model puts in: **high → xhigh → max**.

### Local setup

Claude Code can also connect to **Ollama** and open-source models such as **Qwen** or **Llama 3.2**, enabling a fully local setup. This is currently the only fully local option available.

### Slash commands

- `/model` — switch between models
- `/effort` — set effort level
- `/statusline` — shows total tokens used, which helps decide when to compact a session

---

## 4. Session Management

Sessions let you pause and resume work without losing context.

- `claude -n "session_name"` — start a new named session
- `claude --resume` / `claude --continue` — resume a previous session
- `/status` — check session status
- `/resume` — switch between sessions
- `/fork` — fork the current session into a new one, without modifying the original
- `/compact` — summarizes session data (some data may be removed in the process)
- `/export explore-current-project.md` — export the conversation to a markdown file

### Practical guidance

- Create **multiple sessions** for multiple issues — e.g. 3 sessions for 3 different bugs, potentially using 3 different models.
- Keeping sessions separate means information relevant to bug #1 doesn't pollute the context for bug #2.
- If **80% of context** is used, consider compacting.
- If old context isn't found in the current session, tokens are spent recreating it — and **compaction can lose or distort information**, so use it deliberately.
- There's a **usage limit at the account level**, and every session consumes part of that limit.

---

## 5. Project Configuration

### `CLAUDE.md`

The most important file for giving Claude context about a project:

- Plan first, create architecture first, decide on design templates — **before** telling the tool what to do.
- Defines the rules that control Claude's behavior: which files to use, which JavaScript libraries to prefer, etc.
- Should be **150–200 lines max** at the project root — kept tight and specific.
- You can have a `CLAUDE.md` per sub-folder for more granular guidance.
- If there's no `CLAUDE.md`, Claude has much less grounding — every project should have one.

### `.claude/settings.json`

Created inside a `.claude` folder at the project root:

- `settings.json` — shared, pushed to the repo, applies to the whole team.
- `settings.local.json` — **not** pushed to the repo, overrides `settings.json` for the individual developer.

Example model selection:

```json
{
  "model": "opusplan"
}
```

Example permissions block:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git status)",
      "Bash(git diff)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Read(**)",
      "Write(src/**)",
      "Write(tests/**)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(npm install *)",
      "Write(package.json)"
    ],
    "deny": [
      "Read(./.env*)",
      "Read(./secrets/**)",
      "Read(./**/credentials*)",
      "Bash(rm -rf:*)",
      "Bash(curl:*)",
      "Bash(wget:*)"
    ]
  }
}
```

This is how you control **exactly** what Claude can read, write, or execute in a given project.

### `/init`

Initializes a `CLAUDE.md` file with codebase documentation by scanning the project from the root level.

---

## 6. Auto Mode vs. Plan Mode

- **Auto mode** — Claude decides what to do automatically and does not ask for confirmation at each step.
- **Plan mode** — Claude proposes a plan first and asks you to approve it before making any changes.

Guidance: **always switch to manual/plan mode before making changes** you want to review first — auto mode changes this behavior and proceeds independently. You can also explicitly ask Claude to "just create a plan" without executing it.

> Tip: use a one-off question mode to ask something that runs separately from the main working thread, without disrupting it.

---

## 7. Commands vs. Skills vs. Agents

- **`/commands`** — executed **manually**, defined via a markdown file.
- **Skills** — run **automatically**, triggered based on the user's prompt (no explicit invocation needed). A command can be converted into a skill so it fires without being asked for by name, and skills generally use fewer tokens than many third-party alternatives.
- **Agents** — specialized assistants that do a task, often in the **background**, and report back with an answer. An agent can be invoked directly, handed a task from within a skill, or run via other agentic harnesses (loop, schedule, etc).

> **Rule of thumb:** avoid one-off, repeated tool calls for the same kind of task — don't "go back to the tool again and again." Package repeatable behavior into a command or skill instead.

### Example: custom command — `/standup`

```markdown
---
name: standup
description: Generate a daily standup update from git history and open files
disable-model-invocation: true
---
You are a senior developer preparing a daily standup update for your team.
This is a Node.js/Express authentication API project. You have been working
in this codebase today. Check git log --since="00:00" --oneline and
git diff HEAD to understand what actually changed.

Draft a standup update based only on what you find in the git history
and open files — do not invent or assume work that is not visible.

Format:
Yesterday: [completed items, specific function or file names]
Today:     [in-progress items based on uncommitted changes or open TODOs]
Blockers:  [failing tests, TODO/FIXME comments, incomplete functions]

Keep each section to 3 bullet points maximum.
Use specific names — file names, function names, issue numbers where visible.
Be factual and brief. No filler. Write it as if reading it aloud in 30 seconds.
```

### Example: custom command — `/raise-pr`

```markdown
---
name: raise-pr
description: Raise a GitHub pull request for the current branch targeting main
disable-model-invocation: true
---
You are a senior developer raising a pull request for a fix or feature branch.

Steps:
1. Run git branch --show-current to get the current branch name.
2. Run git log main..HEAD --oneline to list all commits on this branch.
3. Run git diff main...HEAD to inspect all changes introduced by this branch.
4. Check if the branch name or commits reference an issue number (e.g. fix/issue-204
   or "closes #204"). Extract it if present.

Using what you observe, generate a PR title and body:

Title format:
  type(scope): short summary under 72 characters  (same as the commit message)

Body format:
  ## What changed
  - Bullet points describing each logical change
  ## Why it changed
  - The problem or issue this PR resolves (reference issue number if found, e.g. closes #204)
  ## How to test
  - Step-by-step instructions to verify the fix or feature works

Then run:
  gh pr create --base main --title "<title>" --body "<body>"

If the branch has no upstream yet, push it first:
  git push -u origin <branch-name>

Output only the PR title and body. No explanation, no commentary, no preamble.
Be precise and factual. Every word should earn its place.
```

Rule of thumb: if Claude Code is used to create code, it should also be used to create the commit for that code.

### Example: skill — `deploy`

```markdown
---
name: deploy
description: >
  Deploy the application to staging. Use when the user says "deploy",
  "ship it", "push to staging", or "release". Runs pre-flight checks,
  builds, tags, and verifies the deployment. Always confirm with the
  user before executing.
disable-model-invocation: true
---
# Deploy Skill
Deployment logic lives in `scripts/deploy.sh`. That script is the
source of truth — do not re-implement its steps here.

## Before Running
Confirm with the user:
- "Ready to deploy to staging. This will tag and push. Proceed?"
- Do not proceed without explicit confirmation.

## Execution
Run: `bash scripts/deploy.sh`
```

### Example: skill — `write-tests`

```markdown
---
name: write-tests
description: >
  Use this skill whenever new testable logic is added or modified — functions,
  methods, classes, route handlers, or modules in src/. Triggers on: "add a
  function", "create a utility", "implement this", "write a handler", "add a
  route", or any task that produces new logic with inputs and outputs or
  side effects. Do NOT wait to be asked — write tests as part of completing
  the task. Skip this skill only for: config constants, type definitions,
  pure re-exports, or framework boilerplate with no logic.
---
# Write Tests Skill
You are a senior QA engineer writing exhaustive Jest test suites for a
Node.js application.

## Stack & Conventions
- **Framework**: Jest with Supertest for HTTP integration tests
- **Test location**: `tests/` mirroring `src/` structure, `.test.js` suffix
- **Logger**: Structured JSON — never assert on `console` output
- **Auth**: `JWT_SECRET` defaults to `'dev-secret-key'` in tests — do not
  assert real security guarantees against this value
- **Test data**: Define inline for simple cases; use `tests/fixtures/` for
  objects reused across 3+ tests
```

Skills are auto-invoked — e.g. asking *"look at the auth module and tell me if there are any problems"* will automatically trigger the code review skill, with no `/command` needed.

---

## 8. Code Review via Subagents

A **code review skill** can delegate each dimension of the review to a dedicated subagent using the Task tool:

```markdown
## 1. Security
Delegate this dimension to the `security-analyst` subagent using the Task tool.

## 2. Performance
Delegate this dimension to the `performance-analyst` subagent using the Task tool.

## 3. Test Coverage
Delegate this dimension to the `test-coverage-analyst` subagent using the Task tool.

## 4. Code Quality
Delegate this dimension to the `code-quality-analyst` subagent using the Task tool.
```

### Example: custom agent — `security-analyst`

```markdown
---
name: security-analyst
description: >
  Use this agent for security reviews: authentication bypass, injection vulnerabilities, OWASP Top 10, token handling, and input validation. Invoke with: ask the security-analyst to audit this file.
tools: Read, Bash(npm audit *), Bash(grep *), Write, Edit
model: opus
memory: project
---
# Security Analyst Agent
You are a senior application security engineer. You read code exclusively through
a security lens. You do not suggest feature improvements or code style changes.
You find vulnerabilities and you explain how to fix them.

## Your Focus Areas
- Authentication bypass and broken access control
- Injection vulnerabilities: SQL, command, path traversal
- Sensitive data exposure in logs, responses, or error messages
- Insecure token handling: weak secrets, missing expiry, improper storage
- Missing input validation and sanitisation
- Dependency vulnerabilities (flag for npm audit review)

## OWASP Categorisation
Tag every finding with its OWASP Top 10 category where applicable.

## Memory Protocol
Before starting, read `MEMORY.md` (an index of one-line links to note files) and
skim any linked notes whose description looks relevant to the file(s) you're
about to audit.

After completing your audit, write to memory only if you found something
non-obvious, recurring, or specific to this codebase that would save real time
on a future audit — not routine findings you'd already report. If so:
1. Create a new note file named for the pattern (e.g. `jwt-secret-hardcoded-in-config.md`)
   with `name`, `description`, and `metadata: {type: feedback}` frontmatter, following
   the structure used in existing notes.
2. Add a one-line link to it from `MEMORY.md`.

Do not rewrite or duplicate an existing note — update it in place if the same
pattern recurs with new detail.

## Output Format
For each finding:
- OWASP Category
- Severity: Critical / High / Medium / Low
- File and line number
- What an attacker could do with this vulnerability
- Exact fix with corrected code snippet

End with: total finding count by severity, and one recommended immediate action.
```

Agents can specify exactly which tools they're allowed to use — scoping their blast radius to only what the task requires.

### What this looked like in practice

Running this against the training repo's `authService.js`, `tokenHelper.js`, `routes.js`, `middleware.js`, and `validators.js` surfaced **18 findings**, including two critical issues:

1. **Auth bypass** — `bcrypt.compare(...)` called without `await`, so the truthy Promise always passed the check, meaning *every* password was accepted for *any* login.
2. **Hardcoded JWT fallback secret** — `'dev-secret-key'` used silently if `JWT_SECRET` was unset, allowing anyone to forge admin tokens.

A follow-up pass covering **Performance / Test Coverage / Code Quality** against the same file found, among other things, that a missing `async` keyword was actually a `SyntaxError` preventing the entire app from booting — meaning *none* of the code was under test/CI coverage at all. The recommended first action was fixing the missing `async`/`await` pair in one commit, since nothing else was reachable until the module could load.

This is a **hub-and-spoke** model: the main thread dispatches to subagents via a skill, then synthesizes their independent findings into a single report. It's distinct from agents communicating with each other independently in the background — that requires a different setup (see Agent Teams, below).

---

## 9. Hooks

Hooks let you intercept Claude Code at defined **lifecycle boundaries** — points from the start to the end of a session where internal events fire and can trigger your own scripts.

### How hook events work

- When Claude reaches a lifecycle boundary (e.g. a tool is about to run), it spawns your custom script as a subprocess and feeds it a JSON blob on stdin.
- Your script can execute anything, then return:
  - an **exit code** (`0` or `2`), or
  - a **JSON object** on stdout containing a structured decision, reason, and context for Claude to read.
- Hooks can be written in **Python or JavaScript**.

### Example: `PreToolUse` hook on Bash

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/bash-guard.js"
          },
          {
            "type": "command",
            "command": "node .claude/hooks/pretooluse-demo.js"
          }
        ]
      }
    ]
  }
}
```

Since this hook sits directly in front of every Bash call, it's a strong interception point for:

- **Guardrails / safety** — blocking dangerous patterns beyond what `settings.json`'s deny-list covers (e.g. `rm -rf` variants, `git push --force`, piping to `sh`) using regex instead of exact string matching.

### Hook types

A `PreToolUse` hook can run multiple handler types in sequence:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/pretooluse-demo.js" },
          { "type": "http", "url": "https://www.example.com/validate" },
          { "type": "prompt", "prompt": "Evaluate the steps before running the tool" },
          { "type": "agent", "prompt": "Run security-analyst to verify the issues" },
          { "type": "mcp_tool", "server": "some-mcp-server", "tool": "validate_edit" }
        ]
      }
    ]
  }
}
```

### Example: dangerous command patterns to block

```javascript
const DANGER_PATTERNS = [
    /rm\s+-rf\s+\//,                          // recursive force-delete from root (e.g. "rm -rf /")
    /sudo\s+rm/,                              // any sudo-elevated delete — bypasses normal permission checks
    /:\(\)\{\s*:\|:&\s*\}\s*;\s*:/,           // fork bomb — ":(){ :|:& };:" spawns processes until the system locks up
    /dd\s+if=.*of=\/dev\/sd/,                 // raw disk write via dd — can overwrite an entire drive
    /chmod\s+777\s+\//,                       // world-writable permissions on root — opens up the whole filesystem
];
```

### Example: Slack notification hook

```json
{
  "Notification": [
    {
      "matcher": "permission_prompt",
      "hooks": [
        {
          "type": "command",
          "command": "node .claude/hooks/slack-notify.js"
        }
      ]
    }
  ]
}
```

Hook logs can also be used to **audit work** — what was done, when, and how much time was spent.

### Sharing configuration

Everything in the `.claude` folder (settings, hooks, etc.) can be shared across projects via GitHub. Sharing configuration with **third parties** is done through **plugins** — see the [official plugin docs](https://code.claude.com/docs/en/plugins) for details on building one.

---

## 10. MCP (Model Context Protocol)

### The problem it solves

Every SaaS/ecosystem (like GitHub) has its own proprietary way of connecting to it. If Claude had to natively understand every one of these APIs, it would deviate from its core functionality and become unmanageably complex.

Claude *can* connect directly to a REST API (e.g. GitHub's) via `curl`, or indirectly through the `gh` CLI (which itself just wraps Bash commands) — but neither of those approaches scales across dozens of different SaaS tools, each authenticated and structured differently.

### The solution

Anthropic created **MCP (Model Context Protocol)** as a standard interface:

- Claude Code has an **inbuilt MCP client**.
- Any SaaS provider can expose an **MCP server** — essentially a standardized endpoint.
- Claude Code's job is simply to **connect** to the MCP server; the server handles the rest.

### Three types of MCP server

1. **stdio** — runs locally on the machine
2. **http** — hosted at an HTTP location
3. **SSE** — Server-Sent Events, a streaming protocol

All major AI tools support MCP, and the MCP client is a core part of the ecosystem — not something bolted on per-tool.

---

## 11. Agent Teams

Beyond single subagent delegation, Claude Code supports **Agent Teams** — multiple agents working the same task from different angles in parallel, then synthesizing a combined result.

### Example prompt

> Create an agent team to review PR #1.
> Spawn three reviewers:
> - Reviewer 1: focused exclusively on security implications
> - Reviewer 2: focused on performance and scalability
> - Reviewer 3: validating test coverage and edge cases
>
> Have them each review independently, then synthesize findings into a single report.
> Create a new branch with custom name including today's date.
> Merge and close the PR with comment.

The three agents are invoked and run **in the background** simultaneously, each producing an independent review before the results are merged into one report.

> **Distinction:** this hub-and-spoke pattern (main thread dispatching to subagents and synthesizing) is different from agents communicating with **each other** independently in the background to finish a task — that requires other agentic primitives.

### Other agentic primitives

Agents can also be run through other agentic harnesses:

- **Goal**
- **Loop**
- **Schedule**
- **Workflow**
- **Batch**

These help create subtasks — for things like **ultraplan** or **autofix-pr** style automations.

### Quick recap: commands vs. skills vs. agents

- `/commands` are **manual**.
- **Skills** get applied **automatically** based on the prompt.
- **Agents** run **in the background**.

---

## 12. End-to-End Automation

Putting it all together, the full loop that hooks, plugins, MCP, and agents enable is:

**Evaluate code → create an issue → fix the issue → commit → create a PR → review the PR → fix from review → merge**

...largely automatable through a combination of custom commands (`/create-issue`, `/raise-pr`), skills (code review, write-tests), and agents (security/performance/test-coverage/code-quality analysts) — all wired together with hooks for guardrails and MCP for external integrations like GitHub.

---

## Key Takeaways

- The **agentic loop** (gather context → decide → act → verify) is the mental model for everything Claude Code does.
- **CLAUDE.md** and **`.claude/settings.json`** are how you shape Claude's behavior and permissions for a specific project.
- **Commands** are manual, **Skills** auto-trigger, and **Agents** run scoped, background work — often orchestrated together.
- **Hooks** and **MCP** are the two extension points: hooks intercept lifecycle events for guardrails/automation, MCP standardizes how Claude talks to external tools.
- **Session management** (`/resume`, `/fork`, `/compact`) is essential for working on multiple issues without polluting context or wasting tokens.
- **Agent Teams** unlock genuinely parallel, multi-perspective work — like having three reviewers look at a PR simultaneously.

This was a genuinely comprehensive look at how far the agentic coding model has come — from a single loop reading and writing files, to fully orchestrated, permissioned, multi-agent development workflows.
