#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Server Setup Script - makepost.pro
# Run this as root on a fresh Ubuntu 22.04 VPS
# Usage: bash server_setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

REPO_URL="git@github.com:ISAKDANIEL/linkedin-content-generator.git"
APP_DIR="/opt/linkedin-content-generator"
FRONTEND_DOMAIN="app.makepost.pro"
BACKEND_DOMAIN="backend.makepost.pro"
EMAIL="thirumurugan24r@gmail.com"  # For Certbot SSL cert notifications

echo "══════════════════════════════════════════"
echo " Step 1: Update system packages"
echo "══════════════════════════════════════════"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

echo "══════════════════════════════════════════"
echo " Step 2: Install Docker"
echo "══════════════════════════════════════════"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

echo "══════════════════════════════════════════"
echo " Step 3: Install Docker Compose"
echo "══════════════════════════════════════════"
if ! command -v docker compose &> /dev/null; then
    LATEST=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    curl -SL "https://github.com/docker/compose/releases/download/${LATEST}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed: ${LATEST}"
else
    echo "✅ Docker Compose already installed"
fi

echo "══════════════════════════════════════════"
echo " Step 4: Set up SSH key for GitHub"
echo "══════════════════════════════════════════"
if [ ! -f ~/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -C "deploy@makepost.pro" -f ~/.ssh/id_ed25519 -N ""
    echo ""
    echo "⚠️  ADD THIS SSH PUBLIC KEY TO YOUR GITHUB ACCOUNT:"
    echo "     https://github.com/settings/keys"
    echo ""
    cat ~/.ssh/id_ed25519.pub
    echo ""
    echo "Press ENTER after you've added the key to GitHub..."
    read -r
fi

echo "══════════════════════════════════════════"
echo " Step 5: Clone repository"
echo "══════════════════════════════════════════"
if [ -d "$APP_DIR" ]; then
    echo "📁 Repo already exists, pulling latest..."
    cd "$APP_DIR" && git pull
else
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "══════════════════════════════════════════"
echo " Step 6: Set up environment file"
echo "══════════════════════════════════════════"
if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo "⚠️  No backend/.env found!"
    echo "Create it now with your real values. Template:"
    cat << 'ENVTEMPLATE'
OPENAI_API_KEY=your_openai_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
FLASK_ENV=production
JWT_SECRET=your-strong-jwt-secret-here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=https://app.makepost.pro
BACKEND_URL=https://backend.makepost.pro
ENVTEMPLATE
    echo ""
    echo "Press ENTER after you've created backend/.env..."
    read -r
fi

echo "══════════════════════════════════════════"
echo " Step 7: Configure Firewall"
echo "══════════════════════════════════════════"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "✅ Firewall configured"

echo "══════════════════════════════════════════"
echo " Step 8: Install Nginx site configs"
echo "══════════════════════════════════════════"
cp "$APP_DIR/nginx/app.makepost.pro.conf" /etc/nginx/sites-available/app.makepost.pro
cp "$APP_DIR/nginx/backend.makepost.pro.conf" /etc/nginx/sites-available/backend.makepost.pro

ln -sf /etc/nginx/sites-available/app.makepost.pro /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/backend.makepost.pro /etc/nginx/sites-enabled/

# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx
echo "✅ Nginx configured"

echo "══════════════════════════════════════════"
echo " Step 9: Build and start Docker containers"
echo "══════════════════════════════════════════"
cd "$APP_DIR"
docker compose build --no-cache
docker compose up -d
echo "✅ Containers running"
docker compose ps

echo "══════════════════════════════════════════"
echo " Step 10: Enable SSL with Certbot"
echo "══════════════════════════════════════════"
echo "⏳ Getting SSL certificates (DNS must be pointing to this server)..."
certbot --nginx \
    -d "$FRONTEND_DOMAIN" \
    -d "$BACKEND_DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect
echo "✅ SSL enabled for both subdomains!"

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "══════════════════════════════════════════"
echo "  Frontend: https://$FRONTEND_DOMAIN"
echo "  Backend:  https://$BACKEND_DOMAIN"
echo ""
echo "  Test health: curl https://$BACKEND_DOMAIN/health"
echo "══════════════════════════════════════════"
