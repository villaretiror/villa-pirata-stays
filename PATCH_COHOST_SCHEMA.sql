-- [PATCH] REPARACIÓN DE TABLA CO-ANFITRIONES
-- Este script unifica el nombre de la columna para que coincida con el frontend (email)

DO $$ 
BEGIN 
  -- 1. Renombrar si existe la versión vieja
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'property_cohosts' 
             AND column_name = 'cohost_email') 
  THEN
    ALTER TABLE public.property_cohosts RENAME COLUMN cohost_email TO email;
  END IF;

  -- 2. Asegurar que la columna email existe y NO es NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'property_cohosts' 
             AND column_name = 'email') 
  THEN
    ALTER TABLE public.property_cohosts ALTER COLUMN email SET NOT NULL;
  ELSE
    ALTER TABLE public.property_cohosts ADD COLUMN email TEXT NOT NULL;
  END IF;

  -- 3. Asegurar property_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'property_cohosts' 
                 AND column_name = 'property_id') 
  THEN
    ALTER TABLE public.property_cohosts ADD COLUMN property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

END $$;
