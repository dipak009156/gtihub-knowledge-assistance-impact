#!/usr/bin/env bash
PORT=${1:-8000}

echo "=========================================="
echo "  GitHub Knowledge Assistance Share Link  "
echo "=========================================="

if docker info >/dev/null 2>&1; then
    echo "Docker is active! Launching app and Cloudflare Tunnel..."
    docker compose up -d --build
    sleep 4
    echo "Your live public share link:"
    docker compose logs tunnel | grep -o 'https://.*\.trycloudflare\.com' | tail -n 1
else
    echo "Docker is not active. Starting instant public tunnel for 127.0.0.1:$PORT..."
    echo "Press Ctrl+C when you want to stop sharing."
    ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:$PORT nokey@localhost.run
fi
