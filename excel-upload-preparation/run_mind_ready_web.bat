@echo off
rem Mind Ready -- FastAPI backend + the Figma-built React front-end, one URL.
rem Build the front-end first (once, or after UI changes):
rem     cd "..\FigmaOutput" && npm install && npm run build
cd /d "%~dp0"
set MIND_READY_PORT=8600
echo Starting Mind Ready on http://localhost:%MIND_READY_PORT%
start "" http://localhost:%MIND_READY_PORT%
python -m app.web.server
pause
