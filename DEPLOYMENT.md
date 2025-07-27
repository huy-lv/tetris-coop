# CI/CD Deployment Guide

This guide will help you set up automated deployment of the Tetris Game to your Ubuntu server using GitHub Actions.

## 🏗️ Architecture

```
GitHub Repository → GitHub Actions → Ubuntu Server → Docker Container
```

The deployment process:

1. **Build**: Creates Docker image and runs tests
2. **Deploy**: Transfers image to server and runs container
3. **Monitor**: Health checks and automatic restarts

## 🔧 Prerequisites

### On Your Local Machine:

- GitHub CLI installed: `brew install gh` (macOS) or `sudo apt install gh` (Ubuntu)
- Access to your GitHub repository

### On Your Ubuntu Server:

- Ubuntu 20.04+ with sudo access
- Internet connection
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Client), 3001 (Server)

## 🚀 Quick Setup

### Step 1: Setup Ubuntu Server

```bash
# Copy setup script to your server
scp scripts/setup-ubuntu-server.sh user@your-server:/tmp/

# Run setup script on server
ssh user@your-server
chmod +x /tmp/setup-ubuntu-server.sh
sudo /tmp/setup-ubuntu-server.sh
```

### Step 2: Configure GitHub Secrets

```bash
# On your local machine
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

### Step 3: Deploy

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Setup CI/CD deployment"
git push origin main
```

## 🔐 Required GitHub Secrets

| Secret Name       | Description         | Example                                 |
| ----------------- | ------------------- | --------------------------------------- |
| `SERVER_HOST`     | Server IP or domain | `192.168.1.100` or `tetris.example.com` |
| `SERVER_USER`     | SSH username        | `ubuntu` or `root`                      |
| `SERVER_PASSWORD` | SSH password        | Your server password                    |
| `SERVER_PORT`     | SSH port (optional) | `22` (default)                          |

## 📁 Server Directory Structure

```
/opt/tetris-game/
├── tetris-game.tar.gz    # Docker image file
├── monitor.log           # Monitoring logs
└── nginx config          # Reverse proxy setup
```

## 🐳 Docker Container

- **Container Name**: `tetris-app`
- **Client Port**: `3000` (mapped to host)
- **Server Port**: `3001` (mapped to host)
- **Auto-restart**: `unless-stopped`

## 🌐 Access Your Game

After successful deployment:

- **Direct Access**: `http://your-server-ip:3000`
- **Via Nginx**: `http://your-server-ip` (if Nginx is configured)
- **Health Check**: `http://your-server-ip:3001/health`

## 📊 Monitoring

### Automatic Monitoring

- Health checks every 5 minutes via cron job
- Automatic container restart if unhealthy
- Logs stored in `/opt/tetris-game/monitor.log`

### Manual Monitoring

```bash
# Check container status
docker ps | grep tetris-app

# View container logs
docker logs tetris-app

# Check application health
curl http://localhost:3001/health

# View monitoring logs
tail -f /opt/tetris-game/monitor.log
```

## 🔧 Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**:

   - Go to your repo → Actions tab
   - Click on the failed workflow
   - Review build and deploy steps

2. **Common Issues**:

   ```bash
   # SSH connection issues
   ssh -i ~/.ssh/your-key user@server-ip

   # Docker permission issues
   sudo usermod -aG docker $USER
   # Then log out and back in

   # Port conflicts
   sudo netstat -tulpn | grep :3000
   sudo netstat -tulpn | grep :3001
   ```

### Container Won't Start

```bash
# Check Docker logs
docker logs tetris-app

# Check if ports are available
sudo ss -tulpn | grep ':3000\|:3001'

# Restart container manually
docker restart tetris-app

# Rebuild and redeploy
docker stop tetris-app
docker rm tetris-app
# Push new code to trigger redeploy
```

### Health Check Fails

```bash
# Test health endpoint
curl -v http://localhost:3001/health

# Check if server is listening
sudo netstat -tulpn | grep :3001

# Check PM2 processes inside container
docker exec tetris-app pm2 list
```

## 🔄 Manual Deployment

If you need to deploy manually:

```bash
# On your server
cd /opt/tetris-game

# Stop existing container
docker stop tetris-app 2>/dev/null || true
docker rm tetris-app 2>/dev/null || true

# Build new image (if you have source code)
git clone https://github.com/your-username/tetris-coop.git
cd tetris-coop
docker build -t tetris-game:latest .

# Or load from file
# gunzip -c tetris-game.tar.gz | docker load

# Run container
docker run -d \
  --name tetris-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -p 3001:3001 \
  tetris-game:latest
```

## 🔧 Configuration Updates

### Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/tetris-game
sudo nginx -t
sudo systemctl reload nginx
```

### Update Firewall Rules

```bash
# Allow new port
sudo ufw allow 8080/tcp

# Remove old rule
sudo ufw delete allow 8080/tcp

# Check rules
sudo ufw status
```

### Update Environment Variables

Modify the GitHub Actions workflow file `.github/workflows/deploy.yml` to add environment variables:

```yaml
- name: Load and run Docker container
  # ... existing config ...
  script: |
    docker run -d \
      --name ${{ env.CONTAINER_NAME }} \
      --restart unless-stopped \
      -p 3000:3000 \
      -p 3001:3001 \
      -e NODE_ENV=production \
      -e CUSTOM_VAR=value \
      ${{ env.DOCKER_IMAGE_NAME }}:latest
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Run multiple instances on different ports
docker run -d --name tetris-app-2 -p 3002:3000 -p 3003:3001 tetris-game:latest
docker run -d --name tetris-app-3 -p 3004:3000 -p 3005:3001 tetris-game:latest

# Update Nginx for load balancing
# Edit /etc/nginx/sites-available/tetris-game
```

### Resource Limits

```bash
# Limit container resources
docker run -d \
  --name tetris-app \
  --restart unless-stopped \
  --memory=512m \
  --cpus=1.0 \
  -p 3000:3000 \
  -p 3001:3001 \
  tetris-game:latest
```

## 🔒 Security Best Practices

1. **SSH Security**:

   ```bash
   # Disable password authentication
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   sudo systemctl restart ssh
   ```

2. **Firewall**:

   ```bash
   # Only allow necessary ports
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Docker Security**:

   ```bash
   # Run container as non-root user
   docker run --user 1000:1000 ...

   # Use read-only file system where possible
   docker run --read-only ...
   ```

## 📝 Logs and Backup

### Log Locations

- Application logs: `docker logs tetris-app`
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u docker`
- Monitor logs: `/opt/tetris-game/monitor.log`

### Backup Strategy

```bash
# Backup Docker image
docker save tetris-game:latest | gzip > backup-$(date +%Y%m%d).tar.gz

# Backup configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/tetris-game

# Automated backup script
echo "0 2 * * 0 /usr/local/bin/backup-tetris" | sudo crontab -
```
