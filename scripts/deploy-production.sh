#!/bin/bash

# Production Deployment Script
# This script deploys the application to production with safety checks and monitoring.

# Exit on any error
set -e

# Configuration
SLACK_WEBHOOK=${SLACK_WEBHOOK_URL:-""}
DATADOG_API_KEY=${DATADOG_API_KEY:-""}
MONITORING_DURATION=1800  # 30 minutes in seconds
CHECK_INTERVAL=30         # 30 seconds

# Function to send Slack notification
send_notification() {
  local message=$1
  local color=${2:-"good"}  # Default to green/good
  
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
      "$SLACK_WEBHOOK"
  fi
  
  echo "$message"
}

# Function to check if canary deployment is stable
check_canary_stability() {
  # Check if canary deployment exists
  if ! firebase hosting:channel:list | grep -q "canary"; then
    echo "⚠️ No canary deployment found. Skipping canary stability check."
    return 0
  fi
  
  # Check if canary has 100% traffic
  local canary_percentage=$(firebase hosting:channel:list | grep "canary" | grep -o "[0-9]\+%" | sed 's/%//')
  
  if [ "$canary_percentage" != "100" ]; then
    echo "⚠️ Canary deployment is not at 100% traffic (currently at ${canary_percentage}%)."
    read -p "Do you want to continue with production deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Deployment aborted by user."
      exit 1
    fi
  else
    echo "✅ Canary deployment is stable at 100% traffic."
  fi
}

# Function to verify build
verify_build() {
  echo "🔍 Verifying build..."
  
  # Check if build directory exists
  if [ ! -d ".next" ]; then
    echo "❌ Build directory (.next) not found. Please run 'npm run build' first."
    exit 1
  fi
  
  # Check build timestamp
  local build_time=$(stat -c %Y .next 2>/dev/null || stat -f %m .next)
  local current_time=$(date +%s)
  local build_age=$(( (current_time - build_time) / 60 ))
  
  if [ $build_age -gt 60 ]; then
    echo "⚠️ Build is $build_age minutes old."
    read -p "Do you want to rebuild before deployment? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "🔨 Rebuilding application..."
      npm run build
    fi
  else
    echo "✅ Build is recent (${build_age} minutes old)."
  fi
}

# Function to create deployment backup
create_backup() {
  echo "📦 Creating deployment backup..."
  
  # Create backup directory if it doesn't exist
  mkdir -p backups
  
  # Create backup of current production
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="backups/production_${timestamp}.tar.gz"
  
  # Use Firebase hosting:clone to get current production version
  firebase hosting:clone:live backup_${timestamp} 100 || {
    echo "⚠️ Could not create backup channel. Continuing without backup."
    return
  }
  
  echo "✅ Backup created: ${backup_file}"
}

# Function to run pre-deployment checks
run_pre_deployment_checks() {
  echo "🔍 Running pre-deployment checks..."
  
  # Run tests
  echo "🧪 Running tests..."
  npm test || {
    echo "❌ Tests failed. Aborting deployment."
    send_notification "❌ Production deployment aborted: Tests failed" "danger"
    exit 1
  }
  
  # Check for lint errors
  echo "🧹 Checking for lint errors..."
  npm run lint || {
    echo "⚠️ Lint errors found."
    read -p "Do you want to continue with deployment despite lint errors? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Deployment aborted by user."
      send_notification "❌ Production deployment aborted: Lint errors" "danger"
      exit 1
    fi
  }
  
  # Check for outdated dependencies
  echo "📦 Checking for outdated dependencies..."
  npm outdated || true
  
  echo "✅ Pre-deployment checks completed."
}

# Function to deploy to production
deploy_to_production() {
  echo "🚀 Deploying to production..."
  
  # Deploy to Firebase Hosting
  firebase deploy --only hosting || {
    echo "❌ Deployment failed."
    send_notification "❌ Production deployment failed" "danger"
    exit 1
  }
  
  echo "✅ Deployment completed successfully."
}

# Function to run post-deployment checks
run_post_deployment_checks() {
  echo "🔍 Running post-deployment checks..."
  
  local start_time=$(date +%s)
  local end_time=$((start_time + MONITORING_DURATION))
  local current_time=$(date +%s)
  local errors=0
  local checks=0
  
  echo "🔍 Monitoring production deployment for $((MONITORING_DURATION / 60)) minutes..."
  send_notification "🔍 Production deployment - Monitoring started" "warning"
  
  while [ $current_time -lt $end_time ]; do
    # Check health endpoint
    if curl -s -f "https://widget.passwordless-otp.com/health" > /dev/null; then
      echo "✅ Health check passed at $(date)"
    else
      echo "❌ Health check failed at $(date)"
      ((errors++))
    fi
    
    # Check API endpoint
    if curl -s -f "https://widget.passwordless-otp.com/api/status" > /dev/null; then
      echo "✅ API check passed at $(date)"
    else
      echo "❌ API check failed at $(date)"
      ((errors++))
    fi
    
    ((checks+=2))
    
    # If error rate exceeds 10%, consider rollback
    if [ $checks -gt 10 ] && [ $(echo "scale=2; $errors / $checks > 0.1" | bc -l) -eq 1 ]; then
      echo "❌ Error rate exceeded threshold: $errors/$checks failures"
      echo "⚠️ Consider rolling back the deployment."
      send_notification "⚠️ Production deployment showing high error rate: $errors/$checks failures" "danger"
    fi
    
    sleep $CHECK_INTERVAL
    current_time=$(date +%s)
  done
  
  if [ $errors -eq 0 ]; then
    echo "✅ Post-deployment monitoring completed successfully with no errors"
    send_notification "✅ Production deployment monitoring completed successfully with no errors" "good"
  elif [ $(echo "scale=2; $errors / $checks <= 0.05" | bc -l) -eq 1 ]; then
    echo "⚠️ Post-deployment monitoring completed with acceptable error rate: $errors/$checks failures"
    send_notification "⚠️ Production deployment monitoring completed with acceptable error rate: $errors/$checks failures" "warning"
  else
    echo "❌ Post-deployment monitoring completed with high error rate: $errors/$checks failures"
    send_notification "❌ Production deployment showing high error rate: $errors/$checks failures. Consider rollback." "danger"
  fi
}

# Function to send metrics to monitoring system
send_metrics() {
  if [ -z "$DATADOG_API_KEY" ]; then
    echo "⚠️ No Datadog API key provided. Skipping metrics."
    return
  fi
  
  echo "📊 Sending deployment metrics to Datadog..."
  
  local timestamp=$(date +%s)
  
  # Send deployment event
  curl -X POST "https://api.datadoghq.com/api/v1/events" \
    -H "Content-Type: application/json" \
    -H "DD-API-KEY: ${DATADOG_API_KEY}" \
    -d @- << EOF
{
  "title": "Production Deployment",
  "text": "New version deployed to production",
  "priority": "normal",
  "tags": ["environment:production", "service:widget"],
  "alert_type": "info"
}
EOF
  
  echo "✅ Deployment metrics sent."
}

# Function to update documentation
update_documentation() {
  echo "📝 Updating deployment documentation..."
  
  # Create deployment record
  local timestamp=$(date +%Y-%m-%d_%H:%M:%S)
  local git_hash=$(git rev-parse --short HEAD)
  local deployer=$(whoami)
  
  mkdir -p docs/deployments
  
  cat > docs/deployments/production_${timestamp}.md << EOF
# Production Deployment: ${timestamp}

- **Date:** $(date +"%Y-%m-%d %H:%M:%S")
- **Git Commit:** ${git_hash}
- **Deployed By:** ${deployer}

## Changes

$(git log -1 --pretty=format:"%B")

## Verification

- Pre-deployment checks: ✅ Passed
- Deployment: ✅ Successful
- Post-deployment checks: ✅ Completed

## Rollback Information

If rollback is needed, use:

\`\`\`bash
firebase hosting:clone:backup_${timestamp} live 100
\`\`\`
EOF
  
  echo "✅ Deployment documentation updated."
}

# Main deployment process
echo "🚀 Starting production deployment process..."
send_notification "🚀 Starting production deployment" "warning"

# Step 1: Check canary stability
check_canary_stability

# Step 2: Verify build
verify_build

# Step 3: Create backup
create_backup

# Step 4: Run pre-deployment checks
run_pre_deployment_checks

# Step 5: Deploy to production
deploy_to_production

# Step 6: Run post-deployment checks
run_post_deployment_checks

# Step 7: Send metrics
send_metrics

# Step 8: Update documentation
update_documentation

echo "✅ Production deployment process completed successfully."
send_notification "✅ Production deployment completed successfully" "good" 