'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function GuestCompleteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idCountry: 'US',
    idType: 'drivers_license',
    idLast4: '',
    email: '',
    phone: '',
    policyVersion: '1.0'
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [invitationData, setInvitationData] = useState(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  useEffect(() => {
    // Fetch CSRF token and invitation data
    Promise.all([
      fetch('/api/csrf').then(r => r.json()),
      token ? fetch(`/api/guest/invitation-data?token=${encodeURIComponent(token)}`).then(r => r.json()) : Promise.resolve(null)
    ]).then(([csrfData, inviteData]) => {
      setCsrfToken(csrfData.csrfToken);
      
      if (inviteData && inviteData.ok) {
        setInvitationData(inviteData.data);
        
        // Auto-populate form with invitation data
        if (inviteData.data.extended_data) {
          const extData = inviteData.data.extended_data;
          const guestName = extData.guestName || inviteData.data.guest_name || '';
          const nameParts = guestName.split(' ');
          
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: extData.guestEmail || inviteData.data.guest_email || '',
            phone: extData.guestPhone || inviteData.data.guest_phone || ''
          }));
        }
      }
      setLoadingInvitation(false);
    }).catch(error => {
      console.error('Failed to load invitation data:', error);
      setLoadingInvitation(false);
    });
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-semibold text-white mb-4">Invalid Link</h1>
        <p className="text-gray-300">This guest completion link is invalid or expired.</p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('Completing registration...');

    try {
      const response = await fetch('/api/guest/complete', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          token,
          ...formData
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        if (result.verification_url) {
          setMsg('Registration completed! Redirecting to identity verification...');
          // Redirect to Stripe Identity verification
          setTimeout(() => {
            window.location.href = result.verification_url;
          }, 2000);
        } else {
          setMsg('Registration completed! Your host will be notified.');
        }
      } else {
        setMsg(result.error || 'Registration failed');
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
    
    setLoading(false);
  }

  if (loadingInvitation) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-semibold text-white">Complete Guest Registration</h1>
        {invitationData ? (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <p className="text-blue-200 text-sm mb-2">
              <strong>Host:</strong> {invitationData.host_name || 'Resident'}
            </p>
            <p className="text-blue-200 text-sm mb-2">
              <strong>Visit Date:</strong> {new Date(invitationData.visit_date).toLocaleDateString()}
            </p>
            {invitationData.extended_data?.specialInstructions && invitationData.extended_data.specialInstructions !== 'None' && (
              <p className="text-blue-200 text-sm">
                <strong>Instructions:</strong> {invitationData.extended_data.specialInstructions}
              </p>
            )}
          </div>
        ) : null}
        <p className="text-sm text-gray-300">Please provide your information to complete your visit registration.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="p-2 rounded bg-black/40 border border-white/10 text-white"
              placeholder="First Name"
              value={formData.firstName}
              onChange={e => setFormData({...formData, firstName: e.target.value})}
              required
            />
            <input
              className="p-2 rounded bg-black/40 border border-white/10 text-white"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={e => setFormData({...formData, lastName: e.target.value})}
              required
            />
          </div>

          <input
            className="w-full p-2 rounded bg-black/40 border border-white/10 text-white"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
          />

          <input
            className="w-full p-2 rounded bg-black/40 border border-white/10 text-white"
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              className="p-2 rounded bg-black/40 border border-white/10 text-white"
              value={formData.idCountry}
              onChange={e => setFormData({...formData, idCountry: e.target.value})}
              required
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="MX">Mexico</option>
            </select>
            
            <select
              className="p-2 rounded bg-black/40 border border-white/10 text-white"
              value={formData.idType}
              onChange={e => setFormData({...formData, idType: e.target.value})}
              required
            >
              <option value="drivers_license">Driver's License</option>
              <option value="passport">Passport</option>
              <option value="state_id">State ID</option>
            </select>
          </div>

          <input
            className="w-full p-2 rounded bg-black/40 border border-white/10 text-white"
            placeholder="Last 4 digits of ID"
            value={formData.idLast4}
            onChange={e => setFormData({...formData, idLast4: e.target.value.replace(/\D/g, '').slice(0, 4)})}
            maxLength={4}
            required
          />

          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="policy"
              className="mt-1"
              required
            />
            <label htmlFor="policy" className="text-sm text-gray-300">
              I agree to the building policies and understand that my visit is subject to host approval.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {loading ? 'Completing...' : 'Complete Registration'}
          </button>
        </form>

        {msg && <p className="text-sm text-gray-300">{msg}</p>}
      </div>
    </div>
  );
}

export default function GuestCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <GuestCompleteContent />
    </Suspense>
  );
}
