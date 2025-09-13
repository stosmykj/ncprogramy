#!/bin/bash

echo "=========================================="
echo "Setup Gist Auto-Updater for ncprogramy"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will help you set up automatic Gist updates for latest.json${NC}"
echo ""

# Step 1: Create Personal Access Token
echo "Step 1: Create GitHub Personal Access Token"
echo "-------------------------------------------"
echo "1. Go to: https://github.com/settings/tokens/new"
echo "2. Note: 'ncprogramy Gist Updater'"
echo "3. Select scope: 'gist' (only this one)"
echo "4. Click 'Generate token'"
echo "5. Copy the token (you won't see it again!)"
echo ""
read -p "Press Enter when you have the token ready..."
echo ""

read -sp "Paste your Personal Access Token: " GIST_TOKEN
echo ""

if [ -z "$GIST_TOKEN" ]; then
    echo -e "${RED}Error: Token is required${NC}"
    exit 1
fi

# Step 2: Create or use existing Gist
echo ""
echo "Step 2: Create a Gist"
echo "---------------------"
echo "We'll create a new public Gist with a placeholder latest.json"
echo ""

# Create initial latest.json content
INITIAL_CONTENT='{
  "version": "v0.0.0",
  "notes": "Initial placeholder - will be updated by GitHub Actions",
  "pub_date": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "platforms": {}
}'

# Create the Gist
GIST_RESPONSE=$(curl -s -X POST \
    -H "Authorization: token $GIST_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/gists" \
    -d "{
        \"description\": \"ncprogramy auto-updater JSON\",
        \"public\": true,
        \"files\": {
            \"latest.json\": {
                \"content\": $(echo "$INITIAL_CONTENT" | jq -Rs .)
            }
        }
    }")

GIST_ID=$(echo "$GIST_RESPONSE" | jq -r '.id')

if [ -z "$GIST_ID" ] || [ "$GIST_ID" == "null" ]; then
    echo -e "${RED}Error: Failed to create Gist${NC}"
    echo "Response: $GIST_RESPONSE"
    exit 1
fi

GIST_URL="https://gist.githubusercontent.com/$(git config user.name)/$GIST_ID/raw/latest.json"

echo -e "${GREEN}✓ Gist created successfully!${NC}"
echo "  Gist ID: $GIST_ID"
echo "  Raw URL: $GIST_URL"
echo ""

# Step 3: Instructions for GitHub Secrets
echo "Step 3: Add GitHub Secrets"
echo "--------------------------"
echo "Go to: https://github.com/$(git config remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/settings/secrets/actions"
echo ""
echo "Add these two secrets:"
echo ""
echo -e "${YELLOW}1. GIST_TOKEN${NC}"
echo "   Value: $GIST_TOKEN"
echo ""
echo -e "${YELLOW}2. GIST_ID${NC}"
echo "   Value: $GIST_ID"
echo ""
read -p "Press Enter after you've added both secrets..."
echo ""

# Step 4: Update tauri.conf.json
echo "Step 4: Update tauri.conf.json"
echo "-------------------------------"
echo "Updating the updater endpoint..."

# Update tauri.conf.json
sed -i 's|"active": false|"active": true|' src-tauri/tauri.conf.json
sed -i "s|YOUR_GIST_ID|$GIST_ID|" src-tauri/tauri.conf.json

echo -e "${GREEN}✓ tauri.conf.json updated${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "--------"
echo "• Gist ID: $GIST_ID"
echo "• Raw URL: $GIST_URL"
echo "• Updater: Enabled"
echo ""
echo "Next steps:"
echo "1. Commit the changes to tauri.conf.json"
echo "2. Create a new release"
echo "3. The workflow will automatically update the Gist"
echo ""
echo "Test the updater URL:"
echo "  curl $GIST_URL"
echo ""
