#!/bin/bash
PROJECT_URL="https://plpnydhgvqoqwrvuzvzq.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscG55ZGhndnFvcXdydnV6dnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgwNTI4OSwiZXhwIjoyMDgyMzgxMjg5fQ.ThM3yxp4X-rDYtwWh4Ke6GQ4beLtWdqlTHp0ms7MXwg"
TMP_DIR="/tmp/alquimia_master"
mkdir -p $TMP_DIR

# 🧪 Función de Alquimia
process_folder() {
  local prop=$1
  local prefix=$2
  local start_at=$3
  
  echo "--- 🔍 Procesando $prop ($prefix) desde $start_at ---"
  
  # Obtener lista de archivos IMG_ en la carpeta
  # (Simulamos la lista que ya obtuve para evitar redundancia de red)
  if [ "$prop" == "pirata" ]; then
    files=("IMG_7992.jpeg" "IMG_8011.jpeg" "IMG_7938.jpeg" "IMG_8008.jpeg" "IMG_8009.jpeg" "IMG_7994.jpeg" "IMG_8006.jpeg" "IMG_7989.jpeg" "IMG_7996.jpeg" "IMG_8014.jpeg" "IMG_8018.jpeg" "IMG_7998.jpeg" "IMG_8017.jpeg" "IMG_8019.jpeg" "IMG_8021.jpeg" "IMG_8016.jpeg" "IMG_8020.jpeg")
  else
    files=() # Villa Retiro ya está al día
  fi

  count=$start_at
  for f in "${files[@]}"; do
    encoded_f=$(echo "$f" | sed 's/ /%20/g')
    echo "📥 Descargando $f..."
    curl -o "$TMP_DIR/raw" -L "$PROJECT_URL/storage/v1/object/public/villas/$prop/$encoded_f" -s

    echo "🧪 Alquimia: ${prefix}_$count.jpg..."
    sips -Z 1600 "$TMP_DIR/raw" --out "$TMP_DIR/${prefix}_$count.jpg" > /dev/null 2>&1
    sips -s format jpeg -s formatOptions 80 "$TMP_DIR/${prefix}_$count.jpg" > /dev/null 2>&1

    echo "⬆️ Resucitando..."
    curl -X POST "$PROJECT_URL/storage/v1/object/villas/$prop/${prefix}_$count.jpg" \
      -H "Authorization: Bearer $KEY" \
      -H "Content-Type: image/jpeg" \
      --data-binary "@$TMP_DIR/${prefix}_$count.jpg" -s > /dev/null

    count=$((count+1))
  done
}

# 🏴‍☠️ Limpiar Pirata
process_folder "pirata" "pirata" 6

echo "✅ MASTER ALQUIMIA COMPLETADA."
