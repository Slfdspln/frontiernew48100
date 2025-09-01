'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function GuestVerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [guestData, setGuestData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    floor: '',
    isDelivery: false
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoadingData(false);
      return;
    }

    // Decode and load guest data from token
    fetch(`/api/guest/verify-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setGuestData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phoneNumber: data.phoneNumber || '',
            floor: data.floor || '',
            isDelivery: data.isDelivery || false
          });
        } else {
          setMsg(data.error || 'Invalid verification link');
        }
        setLoadingData(false);
      })
      .catch(error => {
        console.error('Failed to load guest data:', error);
        setMsg('Failed to load guest information');
        setLoadingData(false);
      });
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Invalid Link</h1>
          <p className="text-gray-600">This guest verification link is invalid or expired.</p>
        </div>
      </div>
    );
  }

  async function handleProceedToVerification() {
    setLoading(true);
    setMsg('Preparing ID verification...');

    try {
      const response = await fetch('/api/guest/start-verification', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          token,
          ...guestData
        })
      });

      const result = await response.json();
      console.log('Verification API response:', result);
      
      if (result.ok && result.verification_url) {
        setMsg('Redirecting to ID verification...');
        // Redirect to Stripe Identity verification
        setTimeout(() => {
          window.location.href = result.verification_url;
        }, 1500);
      } else {
        console.error('Verification failed:', result);
        setMsg(result.error || 'Failed to start verification');
      }
    } catch (error) {
      console.error('Network error:', error);
      setMsg('Network error. Please try again.');
    }
    
    setLoading(false);
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">Verify Your Identity</h1>
          <p className="text-gray-600 text-center mb-8">Please confirm your details and proceed to ID verification</p>
          
          <div className="space-y-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Your Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="text-gray-900">{guestData.firstName} {guestData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900">{guestData.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Floor Access:</span>
                  <span className="text-gray-900">{guestData.floor}</span>
                </div>
                {guestData.isDelivery && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="text-blue-900 font-medium">Delivery Person</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Next Step: ID Verification</h3>
              <p className="text-blue-800 text-sm">
                You'll be redirected to verify your identity with a photo ID and selfie. 
                This process is secure and required for building access.
              </p>
            </div>
          </div>

          <button
            onClick={handleProceedToVerification}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Preparing...' : 'Proceed to ID Verification'}
          </button>

          {msg && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-800 text-sm text-center">{msg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuestVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <GuestVerifyContent />
    </Suspense>
  );
}