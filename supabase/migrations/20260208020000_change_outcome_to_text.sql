-- Change outcome column from enum to text to support multiple comma-separated outcomes
ALTER TABLE visits ALTER COLUMN outcome TYPE TEXT;
DROP TYPE IF EXISTS visit_outcome; -- Optional: drop the enum type if no longer used, or keep it. Safest to just alter column.
