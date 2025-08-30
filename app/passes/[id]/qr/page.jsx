'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function QRPassPage() {
  const params = useParams();
  const { id } = params;
  
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchQR() {
      try {
        const response = await fetch(`/api/passes/${id}/qr`);
        const result = await response.json();
        
        if (result.ok) {
          setQrData(result.token);
        } else {
          setError(result.error || 'Failed to generate QR code');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchQR();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Generating QR Code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-white mb-2">QR Code Error</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl font-semibold text-white mb-6">Guest Pass QR Code</h1>
        
        <div className="bg-white p-6 rounded-lg mb-6 inline-block">
          <QRCode value={qrData} size={256} />
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Present this QR code at the building entrance for access.
          </p>
          
          <div className="bg-black/40 border border-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-2">Pass ID:</p>
            <p className="text-white font-mono text-sm">{id}</p>
          </div>
          
          <p className="text-gray-400 text-xs">
            This QR code expires at the end of your visit date.
          </p>
        </div>
      </div>
    </div>
  );
}
