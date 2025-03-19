#!/bin/bash

# Canary Deployment Script
# This script deploys a new version to a canary channel and gradually increases traffic.

# Exit on any error
set -e

# Default values
PERCENTAGE=${1:-10}
MONITORING_DURATION=1800  # 30 minutes in seconds
CHECK_INTERVAL=30         # 30 seconds
SLACK_WEBHOOK=${SLACK_WEBHOOK_URL:-""}

# Validate input
if ! [[ "$PERCENTAGE" =~ ^[0-9]+$ ]] || [ "$PERCENTAGE" -lt 1 ] || [ "$PERCENTAGE" -gt 100 ]; then
  echo "❌ Error: Percentage must be a number between 1 and 100"
  exit 1
fi

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

# Function to monitor deployment
monitor_deployment() {
  local start_time=$(date +%s)
  local end_time=$((start_time + MONITORING_DURATION))
  local current_time=$(date +%s)
  local errors=0
  local checks=0
  
  echo "🔍 Monitoring canary deployment for $((MONITORING_DURATION / 60)) minutes..."
  send_notification "🔍 Canary deployment at ${PERCENTAGE}% traffic - Monitoring started" "warning"
  
  while [ $current_time -lt $end_time ]; do
    # Check health endpoint
    if curl -s -f "https://widget.passwordless-otp.com/health?canary=1" > /dev/null; then
      echo "✅ Health check passed at $(date)"
    else
      echo "❌ Health check failed at $(date)"
      ((errors++))
    fi
    
    # Check API endpoint
    if curl -s -f "https://widget.passwordless-otp.com/api/status?canary=1" > /dev/null; then
      echo "✅ API check passed at $(date)"
    else
      echo "❌ API check failed at $(date)"
      ((errors++))
    fi
    
    ((checks+=2))
    
    # If error rate exceeds 10%, rollback
    if [ $checks -gt 10 ] && [ $(echo "scale=2; $errors / $checks > 0.1" | bc -l) -eq 1 ]; then
      echo "❌ Error rate exceeded threshold: $errors/$checks failures"
      return 1
    fi
    
    sleep $CHECK_INTERVAL
    current_time=$(date +%s)
  done
  
  if [ $errors -eq 0 ]; then
    echo "✅ Monitoring completed successfully with no errors"
    return 0
  elif [ $(echo "scale=2; $errors / $checks <= 0.05" | bc -l) -eq 1 ]; then
    echo "⚠️ Monitoring completed with acceptable error rate: $errors/$checks failures"
    return 0
  else
    echo "❌ Monitoring completed with high error rate: $errors/$checks failures"
    return 1
  fi
}

# Main deployment process
echo "🚀 Starting canary deployment at ${PERCENTAGE}% traffic..."

# Build the application
echo "📦 Building application..."
npm run build || {
  send_notification "❌ Canary deployment failed: Build error" "danger"
  exit 1
}

# Deploy to canary channel
echo "🔥 Deploying to Firebase canary channel..."
firebase hosting:channel:deploy canary --expires 7d || {
  send_notification "❌ Canary deployment failed: Channel deployment error" "danger"
  exit 1
}

# Get the canary URL
CANARY_URL=$(firebase hosting:channel:open canary --url)
echo "🔗 Canary URL: $CANARY_URL"

# Shift traffic to canary
echo "🔀 Shifting ${PERCENTAGE}% traffic to canary..."
firebase hosting:clone:live canary ${PERCENTAGE} || {
  echo "❌ Traffic shift failed"
  send_notification "❌ Canary deployment failed: Traffic shift error" "danger"
  exit 1
}

# Monitor the deployment
if monitor_deployment; then
  echo "✅ Canary deployment monitoring successful"
  send_notification "✅ Canary deployment at ${PERCENTAGE}% traffic is stable" "good"
  
  # If we're at 100%, promote to live
  if [ "$PERCENTAGE" -eq 100 ]; then
    echo "🚀 Promoting canary to live..."
    firebase hosting:clone:canary live || {
      echo "❌ Promotion to live failed"
      send_notification "❌ Canary promotion failed" "danger"
      exit 1
    }
    send_notification "🎉 Canary deployment successfully promoted to live" "good"
  else
    echo "🔄 Canary deployment at ${PERCENTAGE}% traffic is stable"
    echo "👉 To increase traffic: npm run deploy:canary:25 (or 50, 100)"
  fi
else
  echo "❌ Canary deployment monitoring detected issues, rolling back..."
  firebase hosting:clone:live live 100
  send_notification "⚠️ Canary deployment at ${PERCENTAGE}% rolled back due to issues" "danger"
  exit 1
fi 