#!/bin/bash
PROJECT_URL="https://plpnydhgvqoqwrvuzvzq.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscG55ZGhndnFvcXdydnV6dnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgwNTI4OSwiZXhwIjoyMDgyMzgxMjg5fQ.ThM3yxp4X-rDYtwWh4Ke6GQ4beLtWdqlTHp0ms7MXwg"
BASE_PATH="/Users/brianrojas/.gemini/antigravity/brain/301e1b16-b1ff-433f-bd4a-a59bbb85fe09"
TMP_DIR="/tmp/pirata_alchemy"
mkdir -p $TMP_DIR

images=(
"media__1775117348187.jpg"
"media__1775117348197.jpg"
"media__1775117348226.jpg"
"media__1775117348236.jpg"
"media__1775117348242.jpg"
)

count=1
for img in "${images[@]}"; do
  # 🧪 Alquimia Local (Ya las tenemos aquí)
  echo "🧪 Optimizando $img..."
  sips -Z 1600 "$BASE_PATH/$img" --out "$TMP_DIR/pirata_$count.jpg" > /dev/null
  sips -s format jpeg -s formatOptions 80 "$TMP_DIR/pirata_$count.jpg" > /dev/null

  # ⬆️ Inyectando en el Búnker
  echo "⬆️ Subiendo pirata_$count.jpg..."
  curl -X POST "$PROJECT_URL/storage/v1/object/villas/pirata/pirata_$count.jpg" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@$TMP_DIR/pirata_$count.jpg" > /dev/null
  
  count=$((count+1))
done

echo "✅ INYECCIÓN PIRATA COMPLETADA."
