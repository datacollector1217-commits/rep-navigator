-- 1. Drop the default value constraint first because it depends on the enum
ALTER TABLE visits ALTER COLUMN outcome DROP DEFAULT;

-- 2. Now convert the column to text
ALTER TABLE visits ALTER COLUMN outcome TYPE TEXT;

-- 3. Now it is safe to drop the type
DROP TYPE IF EXISTS visit_outcome;
