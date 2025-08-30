'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { validateQRCode } from '../../utils/qrCodeUtils';

export const dynamic = 'force-dynamic';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // verifying, valid, invalid, expired
  const [guestData, setGuestData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyPass = async () => {
      if (!token) {
        setVerificationStatus('invalid');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        // Use shared utility which calls the Edge Function
        const data = await validateQRCode(token);
        
        if (data.valid) {
          setVerificationStatus('valid');
          setGuestData(data.pass);
        } else if (data.expired) {
          setVerificationStatus('expired');
          setErrorMessage('This guest pass has expired');
        } else {
          setVerificationStatus('invalid');
          setErrorMessage(data.message || 'Invalid guest pass');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('invalid');
        setErrorMessage((error && error.message) || 'Failed to verify guest pass');
      }
    };

    verifyPass();
  }, [token]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1f1f1f] border border-[#333] rounded-xl p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-6">Frontier Tower Guest Verification</h1>
        
        {verificationStatus === 'verifying' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-gray-300">Verifying guest pass...</p>
          </div>
        )}

        {verificationStatus === 'valid' && guestData && (
          <div className="py-8">
            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-400 mb-4">Valid Guest Pass</h2>
            <div className="bg-[#2a2a2a] rounded-lg p-4 mb-6">
              <p className="text-white text-lg font-medium">{guestData.guest_name}</p>
              <p className="text-gray-400">{guestData.email}</p>
              <p className="text-gray-400">
                Visit Date: {new Date(guestData.visit_date).toLocaleDateString()}
              </p>
              {guestData.notes && (
                <p className="text-gray-400 mt-2 italic">"{guestData.notes}"</p>
              )}
            </div>
            <p className="text-gray-300 text-sm">
              This guest is authorized to enter Frontier Tower.
            </p>
          </div>
        )}

        {(verificationStatus === 'invalid' || verificationStatus === 'expired') && (
          <div className="py-8">
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-400 mb-4">
              {verificationStatus === 'expired' ? 'Expired Guest Pass' : 'Invalid Guest Pass'}
            </h2>
            <p className="text-gray-300 mb-6">{errorMessage}</p>
            <p className="text-gray-400 text-sm">
              This guest is not authorized to enter Frontier Tower.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyGuestPass() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
