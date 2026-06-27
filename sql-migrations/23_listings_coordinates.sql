ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude NUMERIC;

COMMENT ON COLUMN listings.latitude IS 'Latitude GPS de l''annonce (optionnel, fallback par ville)';
COMMENT ON COLUMN listings.longitude IS 'Longitude GPS de l''annonce (optionnel, fallback par ville)';
