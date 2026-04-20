#!/bin/bash
# Wrapper to ensure Node.js is found in PATH for Cursor MCP
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Supabase Credentials
export SUPABASE_URL="https://plpnydhgvqoqwrvuzvzq.supabase.co"
export SUPABASE_PROJECT_ID="plpnydhgvqoqwrvuzvzq"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscG55ZGhndnFvcXdydnV6dnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgwNTI4OSwiZXhwIjoyMDgyMzgxMjg5fQ.ThM3yxp4X-rDYtwWh4Ke6GQ4beLtWdqlTHp0ms7MXwg"
export SUPABASE_ACCESS_TOKEN="sbp_9050a888dc0e554cc9658b524472061d4aa7a47c"

exec /usr/local/bin/npx -y @supabase/mcp-server-supabase@latest "$@"
