#!/bin/bash
# Check for hard-coded CSS values that should use design tokens

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking for hard-coded CSS values..."
echo ""

ERRORS=0

# Check for hard-coded hex colors (except in globals.css where tokens are defined)
echo "Checking for hard-coded hex colors..."
HEX_COLORS=$(grep -rn '#[0-9a-fA-F]\{3,6\}' src/renderer/components --include="*.scss" --include="*.css" 2>/dev/null || true)
if [ -n "$HEX_COLORS" ]; then
  echo -e "${RED}❌ Found hard-coded hex colors:${NC}"
  echo "$HEX_COLORS"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No hard-coded hex colors${NC}"
fi
echo ""

# Check for rgba/rgb colors
echo "Checking for rgba/rgb colors..."
RGBA_COLORS=$(grep -rn 'rgba\?\(' src/renderer/components --include="*.scss" --include="*.css" 2>/dev/null || true)
if [ -n "$RGBA_COLORS" ]; then
  echo -e "${RED}❌ Found rgba/rgb colors (use opacity tokens):${NC}"
  echo "$RGBA_COLORS"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No rgba/rgb colors${NC}"
fi
echo ""

# Check for hard-coded font-sizes (excluding 1px/2px borders)
echo "Checking for hard-coded font-sizes..."
FONT_SIZES=$(grep -rn 'font-size:.*[0-9]px' src/renderer/components --include="*.scss" --include="*.css" 2>/dev/null | grep -v 'var(--' || true)
if [ -n "$FONT_SIZES" ]; then
  echo -e "${RED}❌ Found hard-coded font-sizes:${NC}"
  echo "$FONT_SIZES"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No hard-coded font-sizes${NC}"
fi
echo ""

# Check for hard-coded padding values
echo "Checking for hard-coded padding..."
PADDING=$(grep -rn 'padding:.*[0-9]px' src/renderer/components --include="*.scss" --include="*.css" 2>/dev/null | grep -v 'var(--' || true)
if [ -n "$PADDING" ]; then
  echo -e "${YELLOW}⚠️  Found hard-coded padding (should use spacing tokens):${NC}"
  echo "$PADDING"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check for hard-coded font-weight numeric values
echo "Checking for hard-coded font-weight..."
FONT_WEIGHTS=$(grep -rn 'font-weight:.*[0-9]\{3\}' src/renderer/components --include="*.scss" --include="*.css" 2>/dev/null | grep -v 'var(--' || true)
if [ -n "$FONT_WEIGHTS" ]; then
  echo -e "${RED}❌ Found hard-coded font-weight:${NC}"
  echo "$FONT_WEIGHTS"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No hard-coded font-weight${NC}"
fi
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! CSS is using design tokens correctly.${NC}"
  exit 0
else
  echo -e "${RED}❌ Found $ERRORS categories with hard-coded values.${NC}"
  echo ""
  echo -e "${YELLOW}💡 Tip: Use design tokens from docs/design-tokens.md${NC}"
  exit 1
fi
