#!/bin/bash
PROJECT_URL="https://plpnydhgvqoqwrvuzvzq.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscG55ZGhndnFvcXdydnV6dnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgwNTI4OSwiZXhwIjoyMDgyMzgxMjg5fQ.ThM3yxp4X-rDYtwWh4Ke6GQ4beLtWdqlTHp0ms7MXwg"
TMP_DIR="/tmp/alquimia"
mkdir -p $TMP_DIR

# 🧪 Lista de archivos pesados detectados
files=(
"IMG_7938.png" "IMG_7939.png" "IMG_7940.png" "IMG_7941.png" "IMG_7946.png" 
"IMG_7947.png" "IMG_7948.png" "IMG_7949.png" "IMG_7951.png" "IMG_7952.png" 
"IMG_7953.png" "IMG_7954.png" "IMG_7957.png" "IMG_7961.png" "IMG_7962.png" 
"IMG_7963.png" "IMG_7964.png" "IMG_7965.png" "IMG_7966.png" "IMG_7969.png" 
"IMG_7971.png" "IMG_7972 2.png" "IMG_7976.png"
)

count=6
for f in "${files[@]}"; do
  # 1. Descargar
  encoded_f=$(echo "$f" | sed 's/ /%20/g')
  echo "📥 Descargando $f..."
  curl -o "$TMP_DIR/raw.png" -L "$PROJECT_URL/storage/v1/object/public/villas/villa-retiro/$encoded_f"

  # 2. Alquimia (Redimensionar + Optimizar)
  echo "🧪 Alquimia: vr_$count.jpg..."
  sips -Z 1600 "$TMP_DIR/raw.png" --out "$TMP_DIR/vr_$count.jpg" > /dev/null
  sips -s format jpeg -s formatOptions 80 "$TMP_DIR/vr_$count.jpg" > /dev/null

  # 3. Subir
  echo "⬆️ Resucitando en Supabase..."
  curl -X POST "$PROJECT_URL/storage/v1/object/villas/villa-retiro/vr_$count.jpg" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@$TMP_DIR/vr_$count.jpg" > /dev/null

  count=$((count+1))
done

echo "✅ OPERACIÓN ALQUIMIA VISUAL COMPLETADA."
