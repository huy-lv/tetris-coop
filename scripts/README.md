# Deployment Scripts

This directory contains scripts to help you set up and manage CI/CD deployment for the Tetris Game.

## 📋 Scripts Overview

### 🔧 `setup-ubuntu-server.sh`

**Purpose**: Prepares your Ubuntu server for deployment
**Usage**: Run on your Ubuntu server

```bash
chmod +x scripts/setup-ubuntu-server.sh
sudo ./scripts/setup-ubuntu-server.sh
```

**What it does**:

- Installs Docker and dependencies
- Configures firewall (UFW)
- Sets up Nginx reverse proxy
- Creates monitoring and log rotation
- Configures automatic health checks

### 🔐 `setup-github-secrets.sh`

**Purpose**: Helps you configure GitHub repository secrets for CI/CD
**Usage**: Run on your local machine

```bash
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

**Requirements**:

- GitHub CLI installed (`gh`)
- Authenticated with GitHub (`gh auth login`)

**Secrets it configures**:

- `SERVER_HOST`: Your server's IP address
- `SERVER_USER`: SSH username for your server
- `SERVER_PASSWORD`: SSH password for your server
- `SERVER_PORT`: SSH port (optional, defaults to 22)

### 🧪 `test-deployment.sh`

**Purpose**: Tests the deployment process locally before pushing to GitHub
**Usage**: Run from project root directory

```bash
chmod +x scripts/test-deployment.sh
./scripts/test-deployment.sh
```

**What it tests**:

- Docker image builds successfully
- Container starts without errors
- Health endpoint responds correctly
- Client serves static files
- Socket.IO endpoint is accessible

## 🚀 Quick Start Guide

### 1. Prepare Your Server

```bash
# Copy setup script to your server
scp scripts/setup-ubuntu-server.sh user@your-server:/tmp/

# SSH to your server and run setup
ssh user@your-server
chmod +x /tmp/setup-ubuntu-server.sh
sudo /tmp/setup-ubuntu-server.sh
```

### 2. Configure GitHub Secrets

```bash
# Install GitHub CLI (if not already installed)
# macOS: brew install gh
# Ubuntu: sudo apt install gh

# Login to GitHub
gh auth login

# Run the setup script
./scripts/setup-github-secrets.sh
```

### 3. Test Locally (Optional but Recommended)

```bash
# Test the deployment process locally
./scripts/test-deployment.sh
```

### 4. Deploy

```bash
# Commit and push to trigger deployment
git add .
git commit -m "Setup CI/CD deployment"
git push origin main
```

## 🔍 Troubleshooting

### Script Permission Errors

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Docker Permission Issues

```bash
# Add user to docker group (run on server)
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### SSH Key Issues

````bash
### SSH Connection Issues
```bash
# Test SSH connection manually
ssh user@your-server-ip

# Check SSH configuration on server
sudo nano /etc/ssh/sshd_config
# Ensure: PasswordAuthentication yes
sudo systemctl restart ssh
````

````

### GitHub CLI Not Found

```bash
# Install GitHub CLI
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Or download from: https://github.com/cli/cli#installation
````

## 📁 File Descriptions

| File                      | Purpose              | Target        |
| ------------------------- | -------------------- | ------------- |
| `setup-ubuntu-server.sh`  | Server preparation   | Ubuntu Server |
| `setup-github-secrets.sh` | GitHub configuration | Local Machine |
| `test-deployment.sh`      | Local testing        | Local Machine |
| `README.md`               | Documentation        | Reference     |

## 🔧 Customization

### Modify Server Setup

Edit `setup-ubuntu-server.sh` to:

- Change port configurations
- Add additional software
- Modify Nginx configuration
- Adjust firewall rules

### Modify GitHub Workflow

Edit `.github/workflows/deploy.yml` to:

- Change deployment triggers
- Add additional tests
- Modify container configuration
- Add environment variables

### Modify Test Script

Edit `test-deployment.sh` to:

- Add custom tests
- Change port mappings
- Test additional endpoints
- Modify container settings

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

## 🆘 Getting Help

If you encounter issues:

1. Check the [main deployment guide](../DEPLOYMENT.md)
2. Review GitHub Actions logs in your repository
3. Check server logs: `journalctl -xe`
4. Test Docker locally: `./scripts/test-deployment.sh`
5. Verify server setup: `docker --version && nginx -t`

## 🔄 Updates

To update the deployment scripts:

1. Pull latest changes: `git pull origin main`
2. Re-run server setup if needed: `sudo ./scripts/setup-ubuntu-server.sh`
3. Update GitHub secrets if changed: `./scripts/setup-github-secrets.sh`
4. Test changes locally: `./scripts/test-deployment.sh`
