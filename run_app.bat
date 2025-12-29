@echo off
REM Floor Plan AI Analyzer - Launch Script for Windows
REM This script helps you easily launch the Gradio application

echo.
echo 🏠 Floor Plan AI Analyzer - Launch Script
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.9 or higher.
    pause
    exit /b 1
)

echo ✅ Python found
python --version
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
    echo.
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if dependencies are installed
python -c "import gradio" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Installing dependencies...
    pip install -r requirements_app.txt
    echo ✅ Dependencies installed
    echo.
) else (
    echo ✅ Dependencies already installed
    echo.
)

REM Check for .env file
if exist ".env" (
    echo ✅ .env file found
    for /f "tokens=*" %%a in (.env) do set %%a
) else (
    echo ⚠️  No .env file found. You'll need to enter your API key in the app.
    echo    To fix this: copy .env.example .env and add your Roboflow API key
)

echo.
echo 🚀 Launching Floor Plan AI Analyzer...
echo 📍 The app will be available at: http://localhost:7860
echo ⌨️  Press Ctrl+C to stop the server
echo.
echo ==========================================
echo.

REM Launch the app
python app.py

pause
