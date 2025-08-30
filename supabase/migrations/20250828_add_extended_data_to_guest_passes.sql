-- Add extended_data column to guest_passes table for storing additional form data in QR codes
ALTER TABLE guest_passes 
ADD COLUMN extended_data JSONB;

-- Add index for extended_data queries if needed
CREATE INDEX idx_guest_passes_extended_data ON guest_passes USING gin (extended_data);

-- Add comment explaining the column
COMMENT ON COLUMN guest_passes.extended_data IS 'Additional form data including purpose, floor access, equipment, instructions, etc. for QR code verification';