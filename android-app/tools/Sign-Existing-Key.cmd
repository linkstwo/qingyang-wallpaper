@echo off
setlocal
if "%~1"=="" (
  echo Drag qingyang-0.5.5-unsigned.apk onto this script.
  pause
  exit /b 2
)
set "QY_JAVA=java"
if exist "%JAVA_HOME%\bin\java.exe" set "QY_JAVA=%JAVA_HOME%\bin\java.exe"
"%QY_JAVA%" "%~dp0SignExisting.java" "%~f1" "%~dp0.." "%~dp0..\..\validation\build-0.5.5.properties"
set "QY_RESULT=%ERRORLEVEL%"
pause
exit /b %QY_RESULT%
