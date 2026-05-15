#!/bin/bash

# DKnexAI Production Start Script
echo "🚀 Starting DKnexAI Multi-Agent Backend..."

# Run the RAG Advisor Agent (Port 8002)
# Using python -m app.main to handle package structure
cd Agent_rag && python -m app.main &

# You can add other agents here:
# cd ../Agent_chat && python main.py &
# cd ../Agent_coding && python main.py &

echo "✅ All services initiated."
wait
