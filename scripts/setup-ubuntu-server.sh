#!/bin/bash

# Ubuntu Server Setup Script for Tetris Game Deployment
# Run this script on your Ubuntu server to prepare for CI/CD deployment

set -e

echo "🚀 Setting up Ubuntu server for Tetris Game deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    sudo apt install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed successfully!"
else
    echo "✅ Docker is already installed"
fi

# Install additional tools
echo "🛠️  Installing additional tools..."
sudo apt install -y curl wget unzip nginx ufw fail2ban

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw --force enable

# Create deployment directory
echo "📁 Creating deployment directory..."
sudo mkdir -p /opt/tetris-game
sudo chown $USER:$USER /opt/tetris-game

# Setup Nginx reverse proxy (optional)
echo "🌐 Setting up Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/tetris-game > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Client (React app)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API/Socket.IO server
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/tetris-game /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# Setup log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/tetris-game > /dev/null <<EOF
/opt/tetris-game/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Create monitoring script
echo "📊 Creating monitoring script..."
sudo tee /usr/local/bin/tetris-monitor > /dev/null <<'EOF'
#!/bin/bash

CONTAINER_NAME="tetris-app"
LOG_FILE="/opt/tetris-game/monitor.log"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    log "❌ Container $CONTAINER_NAME is not running"
    
    # Try to restart
    log "🔄 Attempting to restart container..."
    docker start $CONTAINER_NAME 2>/dev/null || {
        log "❌ Failed to restart container"
        exit 1
    }
    
    sleep 10
    
    # Verify restart
    if docker ps | grep -q $CONTAINER_NAME; then
        log "✅ Container restarted successfully"
    else
        log "❌ Container restart failed"
        exit 1
    fi
fi

# Health check
if ! curl -f -s http://localhost:3001/health > /dev/null; then
    log "❌ Health check failed"
    exit 1
fi

log "✅ All checks passed"
EOF

sudo chmod +x /usr/local/bin/tetris-monitor

# Setup cron job for monitoring
echo "⏰ Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/tetris-monitor") | crontab -

echo ""
echo "🎉 Ubuntu server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add these secrets to your GitHub repository:"
echo "   - SERVER_HOST: your server's IP address"
echo "   - SERVER_USER: your server's username"
echo "   - SERVER_PASSWORD: your server's password"
echo "   - SERVER_PORT: SSH port (optional, defaults to 22)"
echo ""
echo "2. Make sure SSH password authentication is enabled:"
echo "   sudo nano /etc/ssh/sshd_config"
echo "   Set: PasswordAuthentication yes"
echo "   sudo systemctl restart ssh"
echo ""
echo "3. Test your setup:"
echo "   docker run -d --name test-tetris -p 3000:3000 -p 3001:3001 tetris-game:latest"
echo ""
echo "4. Your game will be accessible at:"
echo "   http://$(curl -s ifconfig.me)"
echo ""
echo "⚠️  Note: You may need to log out and back in for Docker group changes to take effect"
