@echo off
cd /d "%~dp0"
python -m streamlit run app\ui\streamlit_app.py
pause
