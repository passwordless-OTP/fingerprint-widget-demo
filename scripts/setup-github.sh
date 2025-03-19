#!/bin/bash

# Script to set up GitHub issues for the widget restoration project

# Check if GitHub token is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <github_token>"
  echo "Please provide a GitHub token as an argument."
  echo "You can create a token at https://github.com/settings/tokens"
  echo "The token needs 'repo' scope permissions."
  exit 1
fi

# Set GitHub token
export GITHUB_TOKEN=$1

# Run the GitHub issues creation script
echo "Creating GitHub issues..."
node scripts/create-github-issues.js

# Check if the script was successful
if [ $? -eq 0 ]; then
  echo "GitHub setup completed successfully!"
  echo "You can now view the issues at https://github.com/passwordless-OTP/sso-plus-shopify/issues"
  echo "and the project board at https://github.com/passwordless-OTP/sso-plus-shopify/projects"
else
  echo "Error: GitHub setup failed."
  echo "Please check the error messages above and try again."
fi 