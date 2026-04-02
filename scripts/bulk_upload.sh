#!/bin/bash
URL="https://plpnydhgvqoqwrvuzvzq.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscG55ZGhndnFvcXdydnV6dnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgwNTI4OSwiZXhwIjoyMDgyMzgxMjg5fQ.ThM3yxp4X-rDYtwWh4Ke6GQ4beLtWdqlTHp0ms7MXwg"
BASE_PATH="/Users/brianrojas/.gemini/antigravity/brain/301e1b16-b1ff-433f-bd4a-a59bbb85fe09"

images=(
  "media__1775115843154.jpg"
  "media__1775115843291.jpg"
  "media__1775115844296.jpg"
  "media__1775115844317.jpg"
  "media__1775115844325.jpg"
)

count=1
for img in "${images[@]}"; do
  echo "⬆️ Subiendo $img como vr_$count.jpg..."
  curl -X POST "$URL/storage/v1/object/villas/villa-retiro/vr_$count.jpg" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@$BASE_PATH/$img"
  count=$((count+1))
done

echo "✅ INYECCIÓN COMPLETADA."
