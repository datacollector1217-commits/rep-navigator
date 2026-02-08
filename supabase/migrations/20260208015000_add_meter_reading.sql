-- Add meter_reading column to visits table
ALTER TABLE visits ADD COLUMN IF NOT EXISTS meter_reading INTEGER;
