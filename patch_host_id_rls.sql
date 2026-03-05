-- ============================================================
-- PATCH: Assign host_id + Fix RLS for properties
-- Pega en Supabase → SQL Editor → Run
-- ============================================================

-- 1. Asignar host_id a todas las propiedades que lo tengan NULL
-- Reemplaza con tu UID real de Supabase Auth (lo puedes ver en Authentication → Users)
-- Si solo tienes 1 usuario host, esto lo asigna a todas:
UPDATE public.properties
SET host_id = (
  SELECT id FROM auth.users LIMIT 1
)
WHERE host_id IS NULL;

-- 2. Drop ALL old policies on properties to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view properties." ON public.properties;
DROP POLICY IF EXISTS "Host can insert properties." ON public.properties;
DROP POLICY IF EXISTS "Host can update properties." ON public.properties;
DROP POLICY IF EXISTS "Host can delete properties." ON public.properties;

-- 3. New permissive RLS policies for properties
-- SELECT: Anyone (public)
CREATE POLICY "public_read_properties"
  ON public.properties FOR SELECT
  USING (true);

-- INSERT: Any authenticated user
CREATE POLICY "auth_insert_properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Owner (host_id matches) OR any authenticated user if host_id is null
CREATE POLICY "owner_update_properties"
  ON public.properties FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (host_id = auth.uid() OR host_id IS NULL)
  );

-- DELETE: Owner only
CREATE POLICY "owner_delete_properties"
  ON public.properties FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (host_id = auth.uid() OR host_id IS NULL)
  );

-- 4. Ensure RLS is enabled
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DONE ✅
-- ============================================================
