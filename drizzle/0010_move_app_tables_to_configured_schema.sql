DO $$
DECLARE
  target_schema text := current_setting('app.schema', true);
  table_name text;
BEGIN
  IF target_schema IS NULL OR target_schema = '' THEN
    RAISE EXCEPTION 'app.schema must be configured before running migrations';
  END IF;
  IF target_schema !~ '^[a-z_][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'app.schema must be a lowercase PostgreSQL identifier';
  END IF;

  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', target_schema);

  IF target_schema <> 'situm_explore' THEN
    FOREACH table_name IN ARRAY ARRAY[
      'app_settings',
      'provider_identities',
      'users',
      'workspace_situm_configs',
      'workspaces'
    ]
    LOOP
      IF to_regclass(format('situm_explore.%I', table_name)) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE situm_explore.%I SET SCHEMA %I', table_name, target_schema);
      END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'situm_explore') THEN
      EXECUTE 'DROP SCHEMA situm_explore';
    END IF;
  END IF;
END $$;
