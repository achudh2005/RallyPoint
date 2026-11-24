#!/usr/bin/env bash
# ==============================================================================
# RallyPoint Release Keystore Generator
# ==============================================================================
# Run this ONCE (in any terminal with Java, e.g. GitHub Codespace, Mac, Linux)
# to create your production signing key.
#
# NEVER commit the .keystore file to git!
# ==============================================================================

set -euo pipefail

KEYSTORE_NAME="rallypoint-release.keystore"
KEY_ALIAS="rallypoint"
VALIDITY_DAYS=10000

echo "🏸 Generating RallyPoint Release Keystore ($KEYSTORE_NAME)..."
echo "You will be prompted for a password. Please store this password securely!"
echo ""

keytool -genkeypair -v \
  -keystore "$KEYSTORE_NAME" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -dname "CN=RallyPoint, OU=Mobile, O=RallyPoint, L=Sydney, ST=NSW, C=AU"

echo ""
echo "✅ Keystore generated successfully: $KEYSTORE_NAME"
echo ""
echo "------------------------------------------------------------------------------"
echo "NEXT STEPS TO CONFIGURE GITHUB ACTIONS SECRETS:"
echo "------------------------------------------------------------------------------"
echo "1. Base64 encode the keystore file:"
echo "   Linux/macOS: base64 -w 0 $KEYSTORE_NAME > keystore_base64.txt"
echo "   Windows PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes('$KEYSTORE_NAME')) | Out-File keystore_base64.txt"
echo ""
echo "2. Add the following repository secrets on GitHub:"
echo "   Settings -> Secrets and variables -> Actions -> New repository secret:"
echo "   - ANDROID_KEYSTORE_BASE64 : (Contents of keystore_base64.txt)"
echo "   - ANDROID_KEYSTORE_PASSWORD : (Your chosen keystore password)"
echo "   - ANDROID_KEY_ALIAS : $KEY_ALIAS"
echo "   - ANDROID_KEY_PASSWORD : (Your chosen key password)"
echo ""
echo "⚠️  CRITICAL: Back up $KEYSTORE_NAME and your passwords in a secure password manager."
echo "If you lose this keystore, you will not be able to issue updates to installed apps!"
echo "------------------------------------------------------------------------------"
