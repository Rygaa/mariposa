-- Convert existing image text values to jsonb arrays
-- If image is null, keep it null. If it's a text value, wrap it in an array
ALTER TABLE "MenuItem" 
ALTER COLUMN "image" 
SET DATA TYPE jsonb 
USING CASE 
  WHEN "image" IS NULL THEN NULL 
  WHEN "image" = '' THEN NULL
  ELSE jsonb_build_array("image")
END;