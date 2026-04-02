#!/bin/bash
PROJECT_URL="https://plpnydhgvqoqwrvuzvzq.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscG55ZGhndnFvcXdydnV6dnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgwNTI4OSwiZXhwIjoyMDgyMzgxMjg5fQ.ThM3yxp4X-rDYtwWh4Ke6GQ4beLtWdqlTHp0ms7MXwg"

# 🗑️ Archivos detectados (Villa Retiro)
vr_files=(
"IMG_7938.png" "IMG_7939.png" "IMG_7940.png" "IMG_7941.png" "IMG_7946.png" 
"IMG_7947.png" "IMG_7948.png" "IMG_7949.png" "IMG_7951.png" "IMG_7952.png" 
"IMG_7953.png" "IMG_7954.png" "IMG_7957.png" "IMG_7961.png" "IMG_7962.png" 
"IMG_7963.png" "IMG_7964.png" "IMG_7965.png" "IMG_7966.png" "IMG_7969.png" 
"IMG_7971.png" "IMG_7972 2.png" "IMG_7976.png"
)

# 🏴‍☠️ Archivos detectados (Pirata)
pi_files=("IMG_7992.jpeg" "IMG_8011.jpeg" "IMG_7938.jpeg" "IMG_8008.jpeg" "IMG_8009.jpeg" "IMG_7994.jpeg" "IMG_8006.jpeg" "IMG_7989.jpeg" "IMG_7996.jpeg" "IMG_8014.jpeg" "IMG_8018.jpeg" "IMG_7998.jpeg" "IMG_8017.jpeg" "IMG_8019.jpeg" "IMG_8021.jpeg" "IMG_8016.jpeg" "IMG_8020.jpeg")

echo "🗑️ Purgando archivos pesados de Villa Retiro..."
for f in "${vr_files[@]}"; do
  encoded_f=$(echo "$f" | sed 's/ /%20/g')
  curl -X DELETE "$PROJECT_URL/storage/v1/object/villas/villa-retiro/$encoded_f" -H "Authorization: Bearer $KEY" -s > /dev/null
done

echo "🗑️ Purgando archivos pesados de Pirata Family House..."
for f in "${pi_files[@]}"; do
  encoded_f=$(echo "$f" | sed 's/ /%20/g')
  curl -X DELETE "$PROJECT_URL/storage/v1/object/villas/pirata/$encoded_f" -H "Authorization: Bearer $KEY" -s > /dev/null
done

echo "✅ PURGA COMPLETADA. EL BÚNKER ESTÁ IMPECABLE."
