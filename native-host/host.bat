@echo off
rem Doi lai Haiku (nhanh hon): them chu "rem " vao dau dong set QUIZ_MODEL
set QUIZ_MODEL=sonnet
rem Thu muc kien thuc mon hoc (CLAUDE.md). Bo trong = khong dung tai lieu
set QUIZ_DIR=%~dp0..\KTDC
node "%~dp0host.js" %*
