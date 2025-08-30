/**
 * QR code utilities for the guest pass system
 */
import { supabase } from './supabaseClient';

// Generate QR code data for a guest pass using Supabase Edge Function
export const generateQRCodeData = async (passData) => {
  try {
    // Prepare the request payload based on our Edge Function API
    // Include Authorization: use user session if available; otherwise fall back to public anon key
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    } else if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/qr/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        passId: passData.id,
        guestName: passData.guest_name,
        expiryHours: 24, // 24 hours
        oneTimeUse: true // One-time use passes for security
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate QR code');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Parse QR code data
export const parseQRCodeData = (qrCodeString) => {
  try {
    return JSON.parse(qrCodeString);
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    return null;
  }
};

// Validate a QR code token using the Edge Function
export const validateQRCode = async (token) => {
  try {
    if (!token) {
      return {
        valid: false,
        message: 'No QR code token provided'
      };
    }
    
    // Call the Edge Function to verify the token, include Authorization header (session or anon)
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    } else if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/qr/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to verify QR code');
    }
    
    const result = await response.json();
    
    if (!result.valid) {
      return {
        valid: false,
        message: result.message || 'Invalid QR code'
      };
    }
    
    // Return the guest data from the verification
    return {
      valid: true,
      pass: result.guestData,
      message: result.message || 'QR code verified successfully!'
    };
  } catch (error) {
    console.error('Error validating QR code:', error);
    return {
      valid: false,
      message: 'Error validating QR code. Please try again.'
    };
  }
};

// Legacy function for backward compatibility
export const validatePassCode = async (passId) => {
  try {
    const { data: pass, error } = await supabase
      .from('guest_passes')
      .select('*')
      .eq('id', passId)
      .single();
    
    if (error || !pass) {
      return {
        valid: false,
        message: 'Invalid pass code. Please check and try again.'
      };
    }
    
    // Check if the pass is approved
    if (pass.status !== 'approved') {
      return {
        valid: false,
        message: `This pass is ${pass.status}. Only approved passes can be used.`
      };
    }
    
    // Check if the pass date is valid (today or future)
    const passDate = new Date(pass.visit_date);
    passDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (passDate < today) {
      return {
        valid: false,
        message: 'This pass has expired. It was valid for ' + new Date(pass.visit_date).toLocaleDateString()
      };
    }
    
    // Pass is valid
    return {
      valid: true,
      pass: pass,
      message: 'Pass verified successfully!'
    };
  } catch (error) {
    console.error('Error validating pass:', error);
    return {
      valid: false,
      message: 'Error validating pass. Please try again.'
    };
  }
};

// Check remaining passes for a resident
export const checkRemainingPasses = async (residentId) => {
  try {
    const { data, error } = await supabase.rpc('get_resident_pass_usage', {
      p_resident_id: residentId
    });
    
    if (error) throw error;
    
    return {
      used: data.passes_used,
      limit: data.passes_limit,
      remaining: data.passes_limit - data.passes_used
    };
  } catch (error) {
    console.error('Error checking remaining passes:', error);
    // Default to 0 remaining if there's an error
    return { used: 3, limit: 3, remaining: 0 };
  }
};
// Get the QR code URL from the response data
export const getQRCodeImageUrl = (qrCodeData) => {
  if (!qrCodeData || !qrCodeData.scanUrl) {
    console.error('Invalid QR code data');
    return '';
  }
  return qrCodeData.scanUrl;
};

// Copy QR code link to clipboard
export const copyQRCodeLink = async (qrCodeData) => {
  try {
    if (!qrCodeData || !qrCodeData.scanUrl) return false;
    
    await navigator.clipboard.writeText(qrCodeData.scanUrl);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

// Increment pass usage for a resident
export const incrementPassUsage = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('resident_guest_passes')
      .insert({
        resident_id: userId,
        used_at: new Date().toISOString()
      });
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error incrementing pass usage:', error);
    return false;
  }
};
