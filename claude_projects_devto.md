---
title: Everything I Learned From My Claude Code Training
published: false
description: Full notes from a hands-on Claude Code training — the agentic loop, models, sessions, CLAUDE.md, permissions, commands vs skills vs agents, hooks, MCP, and multi-agent workflows.
tags: ai, claudecode, productivity, devtools
---

# Everything I Learned From My Claude Code Training

I recently went through a hands-on training on **Claude Code** and the broader Claude ecosystem. Below are my complete notes, organized by topic, with screenshots from the session included at each relevant step.

## Table of Contents

1. [The Claude Ecosystem](#1-the-claude-ecosystem)
2. [The Agentic Loop (Query Engine)](#2-the-agentic-loop-query-engine)
3. [Models, Effort, and Slash Commands](#3-models-effort-and-slash-commands)
4. [Session Management](#4-session-management)
5. [Project Configuration](#5-project-configuration)
6. [Auto Mode vs. Plan Mode](#6-auto-mode-vs-plan-mode)
7. [Commands vs. Skills vs. Agents](#7-commands-vs-skills-vs-agents)
8. [Code Review via Subagents](#8-code-review-via-subagents)
9. [Multi-Agent Harness Concepts](#9-multi-agent-harness-concepts)
10. [Hooks](#10-hooks)
11. [MCP (Model Context Protocol)](#11-mcp-model-context-protocol)
12. [End-to-End Automation](#12-end-to-end-automation)
13. [Agent Teams](#13-agent-teams)
14. [Key Takeaways](#14-key-takeaways)

---

## 1. The Claude Ecosystem

Claude Code is one tool within a larger ecosystem, not a standalone product:

1. **Claude AI** — the conversational assistant
2. **Claude Code** — the agentic coding CLI (the focus of this article), which has:
   - An **agentic loop** that loops until the task is completed
   - A **tool system**: git, bash, read, write files
   - A **permission pipeline**, configurable per tool (Allow / Deny / Ask)
   - A **context manager**: compaction and pruning of context within a session
   - **Session persistence**: work can be paused and resumed later, with context and memory maintained
3. **Claude Design** — design tooling
4. **Claude Co-work** — collaboration tooling
5. **Claude Security** — security-focused tooling
6. **Claude Chrome plugin** — browser automation
7. **Claude Office plugin** — office document integration

In the backend, Claude Code talks to the LLM hosted by Anthropic via the `/v1/messages` API.

![Claude ecosystem overview](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image1.png)

> Tools like Cursor, Windsurf, and Perplexity act as **integrators** — giving access to multiple LLMs. Claude, by contrast, offers an entire vertically integrated ecosystem.

---

## 2. The Agentic Loop (Query Engine)

This is the core engine behind Claude Code. Given a request — e.g. *"Create a unit test case for my function"* — the loop works like this:

1. **Gather context** — goes to the file, reads the imported files also, reads the function in the file (which needs to be mocked).
2. **Send context to the LLM** — the LLM decides, based on the context, what unit test cases must be created after it has all the info, and tells Claude Code what actions to take (e.g. "create new test case").
3. **Use tools** — Claude Code creates or modifies the file using its tool system.
4. **Verify** — the agent checks whether the job is done or not (e.g. runs the test to confirm it passes).

Additional properties:

- The **user can modify the context** in between the loop or after it.
- The loop **runs continuously** until the task is not done.
- **Everything depends on the LLM** being used — so it's worth knowing which LLM is best suited for the task.

### Agentic Coding Tools Architecture

![Agentic coding tools architecture diagram 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image2.png)

![Agentic coding tools architecture diagram 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image3.png)

- Claude Code always connects to the Anthropic base URL.
- It can also connect to **Ollama** and open-source models such as **Qwen** or **Llama 3.2** — enabling a fully local setup. This is currently the only fully local option available.

---

## 3. Models, Effort, and Slash Commands

Models, effort levels, and sessions are the main levers for controlling how Claude Code works.

### Models

Four main models, chosen based on the type of task and usage:

1. **Fable** — for complex tasks: architecture, design, security, coding
2. **Opus**
3. **Sonnet**
4. **Haiku** — for simpler tasks

- `Qwen-local` is the local-model equivalent of Haiku.
- `opusplan` = Opus for planning + Sonnet for doing the task.

**Guidance:** try a smaller model at higher effort first — otherwise switch to a new/bigger model as required. Use Fable only if Opus cannot handle the task.

![Models and effort screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image4.png)

*Screen clippings taken: 29-08-2026 02:21 and 29-08-2026 02:14*

### Slash commands for managing everything

- `/model` — switch between different models
- `/effort` — decides the effort to put in: **high → xhigh → max**
- `/statusline` — shown in the Claude prompt, displays total tokens used; helps decide when to compact the session

---

## 4. Session Management

Before starting with Claude Code, it's worth understanding `/sessions` — session management.

- We can **resume from wherever we stopped** using a session ID.
- Start a new session: `claude -n "session_name"`
- Resume a previous session: `claude --resume`, `claude --continue`
- `/status` — check session status

### Practical guidance

1. We can create **3 different sessions** for 3 different issues, potentially working on 3 different models.
2. `/export explore-current-project.md` — exports the conversation to a markdown file, e.g.:

   ```
   ⎿  Conversation exported to: H:\Claude-Code-Projects-17-19-Aug\claude_showcase_17_aug_26\explore-current-project.md
   ```

3. `/fork` — forks the current session so you can go to a new forked session without modifying the original session.
4. If **80% of context** is used, we can compact it.
5. `/resume` — switch between sessions.
6. `/compact` — summarizes the session data; some data could be removed in the process.
7. If old context is not found in the current session, tokens would need to be spent again to recreate it — and **wrong information could get compacted**.
8. There is a **usage limit at the account level**; every session uses a part of that limit.
9. We should create multiple sessions — e.g. 3 different sessions for 3 different bugs. Information for the first bug may not be needed for the second bug, and sessions help Claude read old information without wasting tokens to recreate it.

![Session export screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image5.png)

---

## 5. Project Configuration

### README.md

The most important file for reading all the information about a project.

- **Before telling the tool what to do, plan first** — create the architecture first.
- Decide on a design template.

### CLAUDE.md — Rules

Used to control the behaviour of Claude:

- Which JavaScript library to use.
- Preventing Claude Code from reading sensitive files so it does not use them.
- How to give Claude permission to access your code — what it can read and what it cannot read.

### `.claude` folder and settings

1. First, create a `.claude` folder.
2. Create `settings.json` — accessible to the whole team, pushed to the repo.
3. Create `settings.local.json` — will **not** be pushed to the repo, and will override `settings.json`.

Here you can decide which model to use:

```json
{
  "model": "opusplan"
}
```

Permissions:

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

![Settings configuration screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image6.png)

### `/init`

Initializes a `CLAUDE.md` file with codebase documentation after going through the project at the root level.

- Add conditions for Claude to always follow — should not go above **150 to 200 lines max**; this is very specific to the root of the project.
- We can have a `CLAUDE.md` file for **every sub-folder**.
- If there is no `CLAUDE.md` file, don't rely on Claude having project-specific context — use `CLAUDE.md` for every project.

### Example: the actual CLAUDE.md used in this training repo

```markdown
## Coding Standards
- Always use async/await, never raw Promises
- All functions must have JSDoc comments
- No console.log in production code — use the logger utility
- Every new function must have at least one unit test
- Pure validation functions use a single return statement with a composed expression
- Never use multiple early-return guard clauses in validator functions

## Repository conventions
- CommonJS (`require`/`module.exports`) throughout, not ESM.
- ESLint enforces: `eqeqeq` (always `===`), `curly`, `no-var`/`prefer-const`,
  `no-return-await`, `require-await` (no `async` functions without an `await`),
  unused-arg exception for `_`-prefixed names.
- `.claude/settings.json` denies reads of `.env*`, `secrets/**`, and
  `credentials*` — don't try to work around this to inspect real secrets.

## What Claude Must Never Do
- Never modify .env or .env.\* files
- Never push directly to main branch
- Never remove existing tests
- Never install packages without confirming with the developer

## PR and Git Standards
- Commit messages follow Conventional Commits: feat:, fix:, docs:, test:
- PR descriptions must include: what changed, why it changed, how to test

## Tech Stack
- Runtime: Node.js 20
- Framework: Express.js
- Database: PostgreSQL with Prisma ORM
- Testing: Jest
- Language: ECMAScript 2022 for all new code only

## Architecture
Request flow: `src/index.js` wires Express with `requestLogger` middleware
globally, mounts all auth endpoints under `/api/auth` from `src/api/routes.js`,
and registers `errorHandler` last as the global error middleware.

Layering:
- `src/api/routes.js` — route handlers only; validates input shape, calls into
  `authService`, maps thrown errors to HTTP status codes (e.g. `'Invalid
  credentials'` → 401). It does NOT talk to `tokenHelper.js` directly.
- `src/api/middleware.js` — cross-cutting concerns: `requestLogger`,
  `authenticate` (verifies Bearer token via `tokenHelper.verifyToken`, attaches
  `req.user`), `validateBody` (checks required fields present), `errorHandler`
  (catch-all, returns generic 500).
- `src/auth/authService.js` — business logic: `loginUser`, `refreshToken`,
  `revokeToken`, token generation. Owns the in-memory `refreshTokenStore` (a
  `Map`, standing in for a database — resets on every restart, not shared
  across processes).
- `src/auth/tokenHelper.js` — low-level JWT primitives: `verifyToken`
  (signature + expiry check, throws typed errors), `decodeToken` (no
  verification, for reading claims only), `extractBearerToken`, `getTokenTTL`.
  `authService.js` and `middleware.js` both depend on this; it depends on
  nothing else in the app.
- `src/utils/validators.js` — pure, stateless input validators (email,
  password, UUID, sanitization). No I/O.
- `src/utils/logger.js` — minimal structured JSON logger (stdout/stderr),
  level-gated by `LOG_LEVEL` env var. Not a real observability stack.

There's no real user database: `routes.js` builds a `mockUserRecord` inline
for login, and `authService.getUserById` returns a hardcoded stub — expect
these to be replaced with real persistence rather than extended in place.

JWT config (`JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_EXPIRES_IN`) is read from
env vars in both `authService.js` and `tokenHelper.js` independently, each
with its own fallback default — keep them in sync if changing defaults.

### Request flow (login example)
`POST /api/auth/login` → `validateBody(['email','password'])` → route handler
validates format via `validators.js` → `authService.loginUser()` checks bcrypt
hash, calls `generateAccessToken` (signed JWT) + `generateRefreshToken` (uuid
stored in `refreshTokenStore`) → returns `{ accessToken, refreshToken, user }`.
Protected routes (`/logout`, `/me`) go through `authenticate` middleware,
which calls `tokenHelper.verifyToken` and attaches the decoded payload to
`req.user`.

### Error convention
Route handlers translate known domain errors to HTTP status codes inline
(e.g. `'Invalid credentials'` → 401) and pass everything else to `next(err)`,
where `errorHandler` logs it and returns a generic 500. Preserve this pattern
when adding routes — don't leak internal error messages to clients from the
global handler.

### Token model
Two-token scheme: short-lived signed JWT access token (claims: `sub`, `email`,
`role`) + opaque UUID refresh token stored server-side in `refreshTokenStore`
with `{ userId, createdAt }`. Refresh tokens are revoked by deleting the map
entry (`revokeToken`, logout).
```

> Note: creating a function like this automatically creates a test case also (via the write-tests skill — covered in section 7).

![CLAUDE.md example screen clipping 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image7.png)

![CLAUDE.md example screen clipping 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image8.png)

---

## 6. Auto Mode vs. Plan Mode

- **Auto mode** — Claude decides what to do automatically and does not ask for confirmation.
- **Plan mode** — we can ask Claude to create a plan only, without executing.
- Use `btw` to ask a question which runs separately from the main section.
- **Always switch to manual mode before making changes** you want to review first.
- In plan mode, Claude will ask you to go ahead with the changes first.

![Plan mode screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image9.png)

In auto mode, this behaviour changes — Claude proceeds independently.

---

## 7. Commands vs. Skills vs. Agents

1. **`/commands`** — executed **manually**, defined via a markdown file.
2. **Skills** — run **automatically** for us, based on what's asked. A command can be converted into a skill. Skills go into a skills folder.
   - There are a lot of third-party skills available.
   - It's better to create our own skills, which use fewer tokens compared to those available externally, which tend to use more.
3. **Agents** — specialized assistants that do a task in the background and come up with an answer. Run an agent separately in the background, or run it via a skill — a skill can also hand over a task to an agent.

> **Rule of thumb:** never use one-liners to do your job — don't go back to the tool again and again.

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

![Standup command screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image10.png)

> If Claude Code is used to create code, it should also be used to create the commit.

### Metaprompting

Take help of Claude to create a prompt using the **RCTFCF** framework (Role, Context, Task, Constraint, Format):

> *"Act as a prompt expert and help me create a structured prompt using role, context, task, constraint, and output format which can be used to do a security review for a Node.js API written in the Express framework. I want to check top 10 OWASP issues."*

Also relevant: **chain of thought prompting**, and the observation that **LLMs understand prompting better in their own language** (i.e. structured, explicit formats they're trained to parse).

![Metaprompting screen clipping 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image11.png)

![Metaprompting screen clipping 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image12.png)

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

Running `/raise-pr`:

![Raise PR screen clipping 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image13.png)

![Raise PR screen clipping 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image14.png)

We can see the PR is created:

![PR created screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image15.png)

### Skills are auto-invoked

`/commands` are executed manually, but **skills** get applied automatically based on the prompt. Seeing a list of all skills:

![List of all skills screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image16.png)

Skills could also come from installed plugins.

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

### How to use a skill

Example prompt:

> ❯ look at the auth module and tell me if there are any problems

The code review skill should auto-invoke:

![Code review skill auto-invoked screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image17.png)

No explicit integration is needed — it's auto-invoked. No need to use `/command` explicitly.

A sample of the code review report:

![Code review report sample screen clipping 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image18.png)

![Code review report sample screen clipping 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image19.png)

### Example: skill — `deploy`

If I want to deploy, `deploy.sh` should be used — so we use a deploy skill:

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

Similarly, we can use a write-tests skill to write a test case:

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

Initiating the write-tests skill:

![Write tests skill screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image20.png)

Skills are auto-invoked. LCOV coverage output:

![LCOV coverage screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image21.png)

### Creating a custom agent

Skills, agents, and commands differ as follows:

- **Agent** — a specialized assistant that does a task in the background and comes up with an answer. Run it separately in the background, or run it via a skill — a skill can also hand a task over to an agent.
- In an agent definition, we can specify exactly **what tools the agent can use**.

Example of agents:

![Example of agents screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image22.png)

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

How does a skill hand over a task to an agent?

![Skill handover to agent screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image23.png)

### The agent runs in the background

```
● Agent "Security audit of auth codebase" finished · 4m 42s
```

The security-analyst audit found **18 findings** across `authService.js`, `tokenHelper.js`, `routes.js`, `middleware.js`, and `validators.js`. Two are critical and one of them also breaks the server outright.

**Critical**

1. **Auth bypass** — `bcrypt.compare(...)` at `authService.js:32` is called without `await`, so the truthy Promise always passes the check. Every password is accepted for any login.
2. **Hardcoded JWT fallback secret** — `'dev-secret-key'` in both `authService.js:11` and `tokenHelper.js:8`, used silently if `JWT_SECRET` is unset. Anyone can forge admin tokens.

**High**

3. Login always builds an inline `mockUserRecord` with a constant `id: 'user-001'` and attacker-supplied email — every session collapses to the same identity, with a spoofable email claim.
4. No rate limiting on `/login` or `/refresh` — unlimited credential stuffing / refresh-token brute-forcing.
5. `REFRESH_EXPIRES_IN` is declared but never enforced — refresh tokens never expire.

**Medium (6 findings)** — notably: `authService.js:80` is missing the `async` keyword on `refreshToken`, which is a `SyntaxError` that prevents the server from booting at all (confirmed via `node --check`) — meaning none of this is currently under test/CI coverage; an inverted expiry comparison in `isTokenExpired` that also deletes valid sessions; `/logout` can revoke anyone's refresh token (no ownership check); access tokens aren't invalidated on logout; PII (raw emails) logged on every auth attempt; unbounded in-memory token store (memory-exhaustion DoS).

**Low (7 findings)** — untrimmed email reaching downstream sinks, internal error messages leaked to clients via substring matching, missing JWT algorithm allowlist, missing security headers/CORS/body-size limits, loose `validateBody` treating `null`/`0`/`false` as "present," a low-severity uuid advisory (not reachable, since `uuidv4()` is called with no args), and a latent timing side-channel for user enumeration.

> Good news: the newly added `validateDateOfBirth` (commit `de91f6f`) was checked directly and is clean — correctly rejects rollover dates, future dates, ages over 120, and malformed input. It's not currently wired into any route, so it's not a live attack surface either way.

**Recommended immediate fix (one commit):** add the missing `await` on `bcrypt.compare` (line 32) and the missing `async` on `refreshToken` (line 80) together — the second is required just to get the app to boot, and without it nothing else can even be tested. Rotate `JWT_SECRET` and make it mandatory at startup right after.

---

## 9. Multi-Agent Harness Concepts

When Claude Code itself uses multiple subagents to work on a task, we can say it's using a **multi-agent harness**. The main thread uses the info from all the agents to create a single report.

### A second pass: performance, test coverage, and code quality

Prompt: *"Create agent for performance review, test coverage, and code quality — use the code review skill."*

![Performance/test-coverage/code-quality review screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image24.png)

**Full output — Code Review Report (Performance / Test Coverage / Code Quality)**

> Context: Re-run of the performance, test-coverage, and code-quality dimensions against `src/auth/authService.js` (security was already covered in the prior review). Findings are consistent with the earlier pass; a few additional specifics surfaced this time.

| # | Dimension | Finding | Severity |
|---|---|---|---|
| 1 | Code Quality / Test Coverage | Missing `async` on `refreshToken` (line 80) + `await` at line 92 → `SyntaxError`, module can't load, entire app fails to boot | 🔴 Critical |
| 2 | Code Quality / Test Coverage | `bcrypt.compare` not awaited (line 32) → auth bypass, confirmed independently by ESLint's `require-await` flagging `loginUser` as having no real await | 🔴 Critical |
| 3 | Test Coverage | No test file exists for `authService.js` at all — every exported function has 0% coverage | 🔴 Critical |
| 4 | Test Coverage | `isTokenExpired` inverted logic (line 68) — verified via failing Jest assertions against real signed JWTs | 🔴 Critical |
| 5 | Code Quality | `isTokenExpired` duplicates `tokenHelper.js`'s JWT logic instead of delegating (violates CLAUDE.md's documented layering), and is applied to opaque UUID refresh tokens where it always short-circuits via `jwt.decode() === null` | 🟠 High |
| 6 | Code Quality | `REFRESH_EXPIRES_IN` and `createdAt` are dead code — confirmed via ESLint `no-unused-vars` — refresh tokens never actually expire despite CLAUDE.md documenting a 7-day window | 🟠 High |
| 7 | Performance | Unbounded `refreshTokenStore` Map — no TTL sweep, grows with cumulative logins not concurrent sessions | 🟠 High |
| 8 | Test Coverage | `refreshToken()`, `revokeToken()`, `generateRefreshToken()`, `generateAccessToken()` have no direct unit tests or edge-case coverage | 🟠 High |
| 9 | Performance | `bcryptjs` (pure-JS, not native bcrypt) runs password comparison on the main thread, not the libuv threadpool — inflates tail latency under concurrent login bursts | 🟡 Medium |
| 10 | Code Quality | Swallowed error in `isTokenExpired`'s `catch (err)` (line 69-71) — caught but never logged, inconsistent with the rest of the file's logging pattern | 🟡 Medium |
| 11 | Code Quality | `curly` ESLint rule violation on line 64 (`if (...) return true;` without braces) | 🟡 Medium |
| 12 | Code Quality | `require-await` violation on `getUserById` (line 153) — declared async with no await inside | 🟡 Medium |
| 13 | Test Coverage | `loginUser` with no `userRecord`, JWT claims shape, `getUserById` stub contract — untested but low-risk edge cases | 🟢 Low |
| 14 | Code Quality | `revokeToken`'s "not found" branch logs nothing, inconsistent with other failure branches in the file | 🟢 Low |
| 15 | Code Quality | Imprecise JSDoc return shapes (`@returns {object}` instead of a typed shape) | 🟢 Low |

**New since the last pass**

- Tooling is broken at the project level: `npm run lint` currently fails outright — the repo ships `.eslintrc.json` (legacy config) but has ESLint 10.9.1 installed, which requires flat `eslint.config.*`. No flat config exists at the repo root. The code-quality agent worked around this by building an equivalent flat config in the scratchpad to get real lint signal (never touched the actual repo files), but as things stand today, `npm run lint` gives false confidence — it fails before it even reaches your code. This is worth fixing independent of `authService.js`.
- `bcryptjs` vs native bcrypt (finding 9): not raised as a distinct finding in the first pass — flagged now because it compounds with the login-bypass fix. Once `await` is added back (finding 2), every login request will run a real CPU-bound bcrypt comparison on the main thread; under concurrent login bursts this inflates latency for unrelated concurrent requests. Not urgent, but worth knowing before assuming the fix is "free."

**Summary Score: 2/10 (unchanged)** — the file can't boot, has zero test coverage, and now additionally the project's lint tooling can't even verify it.

**Recommended First Action:** unchanged — fix the missing `async` on `refreshToken` (line 80) together with the missing `await` on `bcrypt.compare` (line 32) in one commit — nothing else here (tests, lint, the rest of the app) is reachable until the module can actually load. Separately, worth a quick fix to add `eslint.config.js` so `npm run lint` works again — that's a repo-wide gap, not specific to this file.

> This is a **hub and spoke model** — using subagents via a skill. However, what we actually want in some cases is **agents communicating with each other independently in the background** to finish a task; the hub-and-spoke approach above cannot do that. Agents can instead be run using other agentic harnesses — loop, schedule, etc.

### Difference between agent and agentic

![Agent vs agentic diagram screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image25.png)

- **Goal**, **loop**, **schedule**, **workflow**, **batch** — agentic primitives available which help create subtasks (e.g. ultraplan, autofix-pr).
- `/commands` are manual.
- Skills get applied automatically based on the prompt.
- `/agent` runs in the background.

---

## 10. Hooks

**HOOKS, PLUGINS, MCP e2e flow** — from evaluating code to fixing code, full auto flow.

Lifecycle methods available in Claude: from the start to the end of a session, internal events fire inside the session, which are used as plug points for our own code.

### Hook event flow

Whenever Claude reaches a lifecycle boundary — e.g. when a tool is about to run — it spawns our custom script as a subprocess and feeds it a JSON blob on stdin. The script can execute anything, then return:

- an exit code (`0` or `2`), or
- a JSON object on stdout containing a structured decision, reason, and context for Claude to read.

Hooks can be created using Python or JavaScript. They take input from Claude Code, display it on screen, and allow the tool to run.

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

Since this hook sits directly in front of every Bash call, it's a good interception point for anything you want enforced before a shell command runs. Some concrete uses, especially relevant to a repo like this:

- **Guardrails / safety** (this is what `bash-guard.js` already seems to do) — block dangerous patterns beyond what `settings.json`'s deny-list covers, e.g. `rm -rf` variants, `git push --force`, piping to `sh`, etc., using regex instead of exact string matching.

### All hook handler types

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

![Hook handler types screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image26.png)

*Screen clipping taken: 29-08-2026 19:34*

### Blocking dangerous commands

```javascript
const DANGER_PATTERNS = [
    /rm\s+-rf\s+\//,                          // recursive force-delete from root (e.g. "rm -rf /")
    /sudo\s+rm/,                              // any sudo-elevated delete — bypasses normal permission checks
    /:\(\)\{\s*:\|:&\s*\}\s*;\s*:/,           // fork bomb — ":(){ :|:& };:" spawns processes until the system locks up
    /dd\s+if=.*of=\/dev\/sd/,                 // raw disk write via dd — can overwrite an entire drive
    /chmod\s+777\s+\//,                       // world-writable permissions on root — opens up the whole filesystem
];
```

### Notification on Slack

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

Logs can be used to audit our work — when we did what, and how much time we spent.

### Sharing configuration

What if I want to use all my settings in the `.claude` folder in another project? This can be done via GitHub. But how can we give it to a third party? Through **plugins** — see [code.claude.com/docs/en/plugins](https://code.claude.com/docs/en/plugins) for how to create one.

---

## 11. MCP (Model Context Protocol)

### The concept of an MCP server

The GitHub REST API knows how to connect to GitHub on your behalf.

![GitHub REST API screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image27.png)

*Screen clipping taken: 29-08-2026 20:26*

Either Claude directly connects via Bash, or via the `gh` CLI — both of which need to be authenticated. Actually, the `gh` CLI is itself using Bash commands under the hood. But can Claude Code directly connect to the GitHub REST API to be faster and more efficient? `curl` can be used for that:

![Curl-based GH REST API connection screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image28.png)

*Screen clipping taken: 29-08-2026 20:30*

### Why MCP exists

Every ecosystem/SaaS (like GitHub) has a separate, specific, proprietary way of connecting to it — so if Claude has to connect to multiple SaaS platforms, it would need to know all of them, which deviates Claude from its core functionality.

Can GitHub give a way to connect directly to a REST API? So Anthropic created a new protocol:

1. Claude Code has an **inbuilt MCP client** when installed.
2. GitHub/any SaaS provider provides an **MCP server** — basically an endpoint.
3. Our job is only to connect to the MCP server; the MCP server handles the rest.

### Three types of MCP server

1. **stdio** — runs locally on the machine
2. **http** — hosted at an HTTP location
3. **SSE** — Server-Sent Events, a streaming protocol

All AI tools support MCP servers. The MCP client is part of the ecosystem.

> Claude Code runs with an agentic harness — the LLM decides what to do, and the LLM tells Claude Code which tools to use.

---

## 12. End-to-End Automation

End-to-end automation of security review → issue creation → issue fix → PR creation → PR fix, all through agents.

![End-to-end automation intro screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image29.png)

![Automation flow screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image30.png)

*Screen clipping taken: 29-08-2026 21:02*

### `/create-issue`

![Create issue screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image31.png)

![Create issue result screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image32.png)

*Screen clipping taken: 29-08-2026 21:05*

### Now fix the issue

![Fix the issue screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image33.png)

*Screen clipping taken: 29-08-2026 21:09*

### Commit the changes

![Commit changes screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image34.png)

![Commit result screen clipping 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image35.png)

*Screen clipping taken: 29-08-2026 21:16*

![Commit result screen clipping 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image36.png)

*Screen clipping taken: 29-08-2026 21:19*

---

## 13. Agent Teams

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

![Agent teams prompt screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image37.png)

*Screen clipping taken: 29-08-2026 21:25*

The 3 agents are invoked in the background:

![Agents invoked in background screen clipping](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image38.png)

*Screen clipping taken: 29-08-2026 21:26*

![Agent team progress screen clipping 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image39.png)

*Screen clipping taken: 29-08-2026 21:38*

![Agent team progress screen clipping 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image40.png)

*Screen clipping taken: 29-08-2026 21:39*

![Agent team result screen clipping 1](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image41.png)

*Screen clipping taken: 29-08-2026 21:39*

![Agent team result screen clipping 2](https://raw.githubusercontent.com/yash-nigam/claude_code_demo/main/images/claude-training/image42.png)

*Screen clipping taken: 29-08-2026 21:44*

---

## 14. Key Takeaways

1. The **agentic loop** (gather context → decide → act → verify) is the mental model for everything Claude Code does.
2. **CLAUDE.md** and **`.claude/settings.json`** are how you shape Claude's behavior and permissions for a specific project.
3. **Commands** are manual, **Skills** auto-trigger, and **Agents** run scoped, background work — often orchestrated together.
4. **Hooks** and **MCP** are the two extension points: hooks intercept lifecycle events for guardrails/automation, MCP standardizes how Claude talks to external tools.
5. **Session management** (`/resume`, `/fork`, `/compact`) is essential for working on multiple issues without polluting context or wasting tokens.
6. **Agent Teams** unlock genuinely parallel, multi-perspective work — like having three reviewers look at a PR simultaneously.

This was a genuinely comprehensive look at how far the agentic coding model has come — from a single loop reading and writing files, to fully orchestrated, permissioned, multi-agent development workflows.
