#!/bin/bash
# ── MakePost.pro — Server Deploy Script ───────────────────────────────────────
# Run this ON your VPS: bash deploy.sh
# Server path: /var/www/linkedin-generator

set -e

PROJECT_DIR="/var/www/linkedin-generator"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "==> Pulling latest code from GitHub..."
cd "$PROJECT_DIR"
git pull origin main

echo "==> Syncing .env file..."
# Copy project-root backend.env → backend/.env so systemd EnvironmentFile picks it up
if [ -f "$PROJECT_DIR/backend.env" ]; then
    cp "$PROJECT_DIR/backend.env" "$BACKEND_DIR/.env"
    echo "    Copied backend.env → backend/.env"
fi

echo "==> Installing Python dependencies..."
cd "$BACKEND_DIR"
pip install -r requirements.txt --quiet

echo "==> Building React frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

echo "==> Restarting Flask backend (gunicorn via systemd)..."
sudo systemctl restart makepost-backend

echo "==> Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅  Deploy complete! Live at https://makepost.pro"
