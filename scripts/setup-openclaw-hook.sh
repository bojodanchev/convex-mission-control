#!/bin/bash
# Mission Control - OpenClaw Integration Setup
# Run this to wire all OpenClaw sessions into Mission Control

echo "🎯 Setting up Mission Control integration..."

# 1. Set environment variable
export MISSION_CONTROL_URL="https://keen-robin-129.convex.site/openclaw/receiveEvent"

# 2. Check if hook exists
HOOK_DIR="$HOME/.openclaw/hooks/mission-control"
if [ ! -d "$HOOK_DIR" ]; then
    echo "❌ Hook directory not found. Creating..."
    mkdir -p "$HOOK_DIR"
fi

# 3. Verify handler exists
if [ ! -f "$HOOK_DIR/handler.ts" ]; then
    echo "❌ Handler file missing. Please copy handler.ts to $HOOK_DIR/"
    exit 1
fi

echo "✅ Hook configured at: $HOOK_DIR/handler.ts"
echo "✅ Webhook URL: $MISSION_CONTROL_URL"
echo ""
echo "🚀 Integration ready!"
echo ""
echo "Next steps:"
echo "1. Restart OpenClaw Gateway: openclaw gateway restart"
echo "2. Start any agent session"
echo "3. Watch tasks appear in Mission Control"
echo ""
echo "🔗 Dashboard: https://convex-mission-control.vercel.app"
