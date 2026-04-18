#!/bin/bash
# IPTVCloud.app Key Generator for Linux
# Usage: bash tools/generate-keys.sh

# Function to generate base64url string
generate_key() {
    openssl rand -base64 "$1" | tr -d '\n' | tr '+/' '-_' | tr -d '='
}

JWT_SECRET=$(generate_key 64)
ADMIN_API_KEY=$(generate_key 32)

echo ""
echo -e "\033[0;36m--- IPTVCloud.app Security Keys ---\033[0m"
echo ""
echo -n "JWT_SECRET: "
echo -e "\033[0;32m$JWT_SECRET\033[0m"
echo -n "ADMIN_API_KEY: "
echo -e "\033[0;32m$ADMIN_API_KEY\033[0m"
echo ""
echo "Copy these values into your .env file or Vercel Environment Variables."
echo "Keep these keys secret! If compromised, anyone can sign tokens as admin."
echo ""
