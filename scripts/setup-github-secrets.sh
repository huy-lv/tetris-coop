#!/bin/bash

# GitHub Secrets Setup Guide for Tetris Game CI/CD
# This script helps you set up the required secrets for GitHub Actions

echo "🔐 GitHub Secrets Setup Guide for Tetris Game"
echo "=============================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is not installed."
    echo "📥 Please install it first:"
    echo "   - macOS: brew install gh"
    echo "   - Ubuntu: sudo apt install gh"
    echo "   - Windows: winget install GitHub.cli"
    echo ""
    echo "🔗 Or visit: https://github.com/cli/cli#installation"
    exit 1
fi

# Check if user is logged in
if ! gh auth status &> /dev/null; then
    echo "🔑 Please log in to GitHub first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Function to set secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_multiline=${3:-false}
    
    echo "🔧 Setting up: $secret_name"
    echo "   Description: $secret_description"
    echo ""
    
    if [ "$is_multiline" = true ]; then
        echo "📝 Please paste the $secret_name (press Ctrl+D when done):"
        secret_value=$(cat)
    else
        echo -n "📝 Enter $secret_name: "
        read -r secret_value
    fi
    
    if [ -n "$secret_value" ]; then
        echo "$secret_value" | gh secret set "$secret_name"
        echo "✅ $secret_name has been set successfully!"
    else
        echo "⚠️  Skipping $secret_name (empty value)"
    fi
    echo ""
}

echo "📋 You need to set up these secrets for CI/CD deployment:"
echo ""

# SERVER_HOST
set_secret "SERVER_HOST" "Your Ubuntu server's IP address or domain name"

# SERVER_USER  
set_secret "SERVER_USER" "Username for SSH connection (e.g., ubuntu, root)"

# SERVER_PASSWORD
set_secret "SERVER_PASSWORD" "Password for SSH connection"

# SERVER_PORT (optional)
echo "🚪 SERVER_PORT is optional (defaults to 22)"
read -p "📝 Enter SSH port (press Enter for default 22): " server_port
if [ -n "$server_port" ] && [ "$server_port" != "22" ]; then
    echo "$server_port" | gh secret set "SERVER_PORT"
    echo "✅ SERVER_PORT has been set to $server_port"
fi

echo ""
echo "🎉 All secrets have been configured!"
echo ""
echo "📋 Current secrets in your repository:"
gh secret list

echo ""
echo "🚀 Next steps:"
echo "1. Make sure your Ubuntu server is set up (run setup-ubuntu-server.sh)"
echo "2. Push your code to trigger the deployment workflow"
echo "3. Check GitHub Actions tab for deployment status"
echo ""
echo "🔍 To verify your secrets:"
echo "   gh secret list"
echo ""
echo "🗑️  To delete a secret:"
echo "   gh secret delete SECRET_NAME"
