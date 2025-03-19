# Deployment Guide

This guide provides instructions for completing the CI/CD pipeline setup and pushing changes to GitHub.

## Pushing Changes to GitHub

GitHub now requires token-based authentication instead of passwords. Follow these steps to push your changes:

### Option 1: Using GitHub CLI

1. Install GitHub CLI if you haven't already:
   ```bash
   # macOS
   brew install gh
   
   # Windows
   winget install -e --id GitHub.cli
   
   # Linux
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh
   ```

2. Authenticate with GitHub:
   ```bash
   gh auth login
   ```

3. Push changes with GitHub CLI:
   ```bash
   gh repo set-default passwordless-OTP/sso-plus-shopify
   git push origin master
   ```

### Option 2: Using a Personal Access Token

1. Generate a Personal Access Token (PAT):
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Select the "repo" scope
   - Generate the token and copy it

2. Use our script to push with the token:
   ```bash
   # Update the token in the script
   echo "export GH_TOKEN=your_token_here" > .token-script.sh
   chmod +x .token-script.sh
   
   # Run the push with token script
   ./push-with-token.sh $(grep -o 'GH_TOKEN=.*' .token-script.sh | cut -d'=' -f2)
   ```

3. Alternatively, you can set up credential caching:
   ```bash
   git config --global credential.helper cache
   git remote set-url origin https://USERNAME:TOKEN@github.com/passwordless-OTP/sso-plus-shopify.git
   git push origin master
   ```

## Obtaining a Firebase Token for CI/CD

The CI/CD pipeline requires a Firebase token for deployments. Follow these steps to obtain one:

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase and get a CI token:
   ```bash
   firebase login
   firebase login:ci
   ```

3. The command will open a browser for authentication and then display a token in the terminal.
   Copy this token - it should start with `1//...`

4. Store this token as a GitHub secret:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `FIREBASE_TOKEN`
   - Value: Paste the token you copied
   - Click "Add secret"

## Setting Up Slack Webhook for Notifications

1. Go to your Slack workspace
2. Navigate to Apps → Manage → Custom Integrations → Incoming Webhooks
3. Click "Add Configuration"
4. Choose a channel for notifications
5. Copy the Webhook URL
6. Add it as a GitHub secret named `SLACK_WEBHOOK_URL`

## Configuring Environment Variables for Environments

For each environment (staging, canary, production), set up environment-specific configuration files:

1. Create configuration files:
   ```bash
   mkdir -p config
   touch config/staging.env
   touch config/canary.env
   touch config/production.env
   ```

2. Add the required environment variables to each file:
   ```
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   
   # Fingerprint.js Pro Configuration
   NEXT_PUBLIC_FINGERPRINT_API_KEY=your-fingerprint-api-key
   
   # Deployment Settings
   WIDGET_VERSION=1.0.1
   WIDGET_THEME=default
   WIDGET_LANGUAGE=en
   ENABLE_ANALYTICS=true
   ANALYTICS_ENDPOINT=https://analytics.example.com
   LOG_ENDPOINT=https://logs.example.com
   ERROR_TRACKING_ENDPOINT=https://errors.example.com
   ENABLE_OTP_VERIFICATION=true
   ENABLE_PHONE_FORMATTING=true
   ENABLE_USER_ACTIVITY_LOGGING=true
   ENABLE_DEVICE_FINGERPRINTING=true
   ```

## Testing the CI/CD Pipeline

After setting up the secrets and pushing your changes, the CI/CD pipeline should run automatically. You can monitor it in the GitHub Actions tab of your repository. 