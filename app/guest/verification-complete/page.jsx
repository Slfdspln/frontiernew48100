'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function VerificationCompleteContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const passId = searchParams.get('pass_id');
  
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your identity...');
  const [walletUrl, setWalletUrl] = useState(null);

  useEffect(() => {
    if (!sessionId || !passId) {
      setStatus('error');
      setMessage('Invalid verification session');
      return;
    }

    // Check verification status
    checkVerificationStatus();
  }, [sessionId, passId]);

  async function checkVerificationStatus() {
    try {
      const response = await fetch('/api/guest/verification-status', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          passId
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        setStatus(result.status);
        setMessage(result.message);
        
        if (result.status === 'approved' && result.walletUrl) {
          setWalletUrl(result.walletUrl);
        }
      } else {
        setStatus('error');
        setMessage(result.error || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'approved': return 'text-green-400';
      case 'error': 
      case 'verification_failed': 
      case 'verification_canceled': return 'text-red-400';
      case 'loading': 
      case 'pending_verification': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'approved': return '✅';
      case 'error': 
      case 'verification_failed': 
      case 'verification_canceled': return '❌';
      case 'loading': 
      case 'pending_verification': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl mb-4">
          {getStatusIcon()}
        </div>
        
        <h1 className="text-2xl font-semibold text-white">
          Identity Verification
        </h1>
        
        <p className={`text-lg ${getStatusColor()}`}>
          {message}
        </p>

        {status === 'loading' && (
          <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
        )}

        {status === 'approved' && (
          <div className="space-y-4">
            <p className="text-green-400">
              🎉 Your identity has been verified! Your guest pass is ready.
            </p>
            
            {walletUrl && (
              <a 
                href={walletUrl}
                className="inline-block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                📱 Add to Apple Wallet
              </a>
            )}
            
            <p className="text-sm text-gray-400">
              {walletUrl 
                ? "Your pass will be available in your Apple Wallet for easy access during your visit."
                : "Your Apple Wallet pass is being generated and will be available shortly."
              }
            </p>
          </div>
        )}

        {status === 'verification_failed' && (
          <div className="space-y-4">
            <p className="text-red-400">
              Your identity verification needs additional information. Please try again or contact support.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry Verification
            </button>
          </div>
        )}

        {status === 'verification_canceled' && (
          <div className="space-y-4">
            <p className="text-red-400">
              Identity verification was canceled. Please complete verification to receive your guest pass.
            </p>
            <button 
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerificationCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <VerificationCompleteContent />
    </Suspense>
  );
}