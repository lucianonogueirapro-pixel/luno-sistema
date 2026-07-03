-- Políticas de storage para o bucket consulta-fotos
-- Necessário para que usuários autenticados possam fazer upload de fotos no prontuário

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'upload consulta-fotos'
  ) THEN
    CREATE POLICY "upload consulta-fotos"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'consulta-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'select consulta-fotos'
  ) THEN
    CREATE POLICY "select consulta-fotos"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'consulta-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'delete consulta-fotos'
  ) THEN
    CREATE POLICY "delete consulta-fotos"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'consulta-fotos');
  END IF;

  -- Garantir também as políticas do fotos-clinicas (bucket das fotos do prontuário definitivo)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'upload fotos-clinicas'
  ) THEN
    CREATE POLICY "upload fotos-clinicas"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'fotos-clinicas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'select fotos-clinicas'
  ) THEN
    CREATE POLICY "select fotos-clinicas"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'fotos-clinicas');
  END IF;
END $$;
