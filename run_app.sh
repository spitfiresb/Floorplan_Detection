#!/bin/bash

# Floor Plan AI Analyzer - Launch Script
# This script helps you easily launch the Gradio application

echo "🏠 Floor Plan AI Analyzer - Launch Script"
echo "=========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import gradio" &> /dev/null; then
    echo "📥 Installing dependencies..."
    pip install -r requirements_app.txt
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Check for .env file
if [ -f ".env" ]; then
    echo "✅ .env file found - loading environment variables"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. You'll need to enter your API key in the app."
    echo "   To fix this: cp .env.example .env and add your Roboflow API key"
fi

echo ""
echo "🚀 Launching Floor Plan AI Analyzer..."
echo "📍 The app will be available at: http://localhost:7860"
echo "⌨️  Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

# Launch the app
python app.py
