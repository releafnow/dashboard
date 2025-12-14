-- Run this script as postgres superuser to fix permissions
-- Usage: sudo -u postgres psql -d releafnow -f fix_permissions.sql

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO releafnow_user;

-- Grant all privileges on the public schema
GRANT ALL PRIVILEGES ON SCHEMA public TO releafnow_user;

-- Grant privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO releafnow_user;

-- Grant privileges on all existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO releafnow_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO releafnow_user;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO releafnow_user;

-- Make the user the owner of the schema (alternative approach)
-- ALTER SCHEMA public OWNER TO releafnow_user;



