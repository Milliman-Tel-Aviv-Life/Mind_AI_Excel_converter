# Mind Preparer

Gets an actuarial Excel model ready for **Milliman Mind** — and proves it.

The app reads a workbook, checks it against 96 readiness rules mined from the
Mind knowledge base, applies the fixes you approve through Excel itself (so real
workbooks with data models and VBA survive), recalculates to prove nothing
changed, names grids from their context, and — if you let it — uploads the
result to real Mind, converts it, runs it, and reports back, with nobody in the
loop.

## What is in this repository

| Folder | What it is |
|---|---|
| `excel-upload-preparation/` | The app: FastAPI backend, rules, validators, prep engine, Excel/Mind automation, tests, docs. **Start here.** |
| `FigmaOutput/` | The React front-end (Vite + Tailwind). Its built `dist/` is committed, so you do not need Node to run the app. |
| `0*_*.md` | The Mind knowledge-base documents the rules were mined from. Reference only — the app does not read them at runtime. |

The backend serves the front-end from `../FigmaOutput/dist`, which is why the
two folders ship together.

## Run it (Windows)

Requirements on the machine: **Windows**, **Microsoft Excel**, **Python 3.11+**.
For the Mind automation, **Microsoft Edge** as well. Node is not required.

```bat
git clone https://github.com/JosephAIWork/Mind_Preparer.git
cd Mind_Preparer\excel-upload-preparation
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
run_mind_ready_web.bat
```

That opens <http://localhost:8600>. Check <http://localhost:8600/api/health>:

```json
{"version":"1.6.8","excel":true,"assistant":false,"rules":96,"frontend":true}
```

- `excel:true` — Excel is reachable through COM. Without it the app analyses
  and reports but will not write workbooks (a pure-Python save corrupts real
  models, so it refuses rather than guesses).
- `frontend:true` — the built UI was found. If it says `false`, set
  `MIND_READY_DIST` to the path of `FigmaOutput/dist`, or rebuild it with
  `cd FigmaOutput && npm install && npm run build`.
- `assistant:false` — expected on a fresh machine; see the next section.

Then: **Workbook** → upload → **Findings** → **Prep** (tick what you approve,
Apply) → **Download** in the sidebar. Full walkthrough:
[`excel-upload-preparation/docs/RUN_IN_MIND.md`](excel-upload-preparation/docs/RUN_IN_MIND.md).

## Optional pieces

**The assistant** (grid names from context, the chat, formula-fix suggestions)
uses the Milliman APIM Claude gateway. It needs a `secret.key` (a Fernet key)
with a sibling `config.enc` (the encrypted APIM subscription key), placed in
the repository root or any folder up to four levels above `excel-upload-preparation`.
Without it, every feature still works with deterministic names and the
assistant reports itself unavailable. Never commit these files — they are in
`.gitignore`.

**Real Mind** (the *Mind* screen and `scripts/run_in_mind.py`) drives the
Milliman Mind web app through its own Edge profile. Log in once:

```bat
python -m app.mind_client login https://shared.milliman-mind.com/init/71/<your-project-id>
python -m app.mind_client check      # -> "authenticated": true
```

The session is kept under `%LOCALAPPDATA%\MindReady` on that machine. What the
autonomous loop does and how to read its report:
[`docs/RUN_IN_MIND_LOOP.md`](excel-upload-preparation/docs/RUN_IN_MIND_LOOP.md).

## Tests

```bat
cd excel-upload-preparation
python -m pytest tests -q
```

124 tests. The ones that write through Excel or recalculate skip themselves on
a machine without Excel (so the suite also runs on Linux — it just proves less
there).

## Working on it without Excel or Mind (e.g. a cloud sandbox)

Everything in Python is editable and unit-testable anywhere; the front-end
builds anywhere with Node. What cannot run outside Windows-with-Excel: applying
prep to a workbook, the recalculation gate, and the Mind loop. Treat green
tests on Linux as "the logic holds", not as "the workbook is proven" — that
proof needs Excel.

## Documents worth reading

- `excel-upload-preparation/README.md` — architecture, rule set, what each phase does
- `excel-upload-preparation/CHANGELOG.md` — every change with the reasoning, newest first
- `docs/RUN_IN_MIND.md`, `docs/RUN_IN_MIND_NAMING.md`, `docs/RUN_IN_MIND_LOOP.md` — the three runbooks

## What is deliberately not here

Client workbooks, run outputs, change logs, secrets and Mind sessions are
excluded by `.gitignore`. Keep it that way.
