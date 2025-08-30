-- Create atomic check-in function for guest passes
CREATE OR REPLACE FUNCTION check_in_guest(p_pass_id UUID, p_jti UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert token usage record and update pass status atomically
  INSERT INTO used_qr_tokens (pass_id, jti, used_at) 
  VALUES (p_pass_id, p_jti, NOW());
  
  UPDATE guest_passes 
  SET status = 'checked_in', checked_in_at = NOW()
  WHERE id = p_pass_id AND status = 'scheduled';
  
  -- Verify the update actually happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pass not found or not in scheduled status';
  END IF;
END;
$$ LANGUAGE plpgsql;
