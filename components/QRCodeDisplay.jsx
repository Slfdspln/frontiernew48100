'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ passId, guestName, scheduledDate }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  const generateQR = async () => {
    if (!passId) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/passes/${passId}/qr`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get QR code');
      }

      if (data.qr_data) {
        const canvas = canvasRef.current;
        const qrUrl = await QRCode.toDataURL(data.qr_data, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        setQrDataUrl(qrUrl);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQR();
  }, [passId]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `guest-pass-${passId}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Generating QR code...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">QR Code Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={generateQR}
                className="bg-red-100 px-2 py-1 text-sm font-medium text-red-800 rounded hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">No QR code available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Guest Pass QR Code</h3>
        {guestName && (
          <p className="text-sm text-gray-600">For: {guestName}</p>
        )}
        {scheduledDate && (
          <p className="text-sm text-gray-600">
            Visit: {new Date(scheduledDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
          <img 
            src={qrDataUrl} 
            alt="Guest Pass QR Code" 
            className="w-64 h-64"
          />
        </div>
      </div>

      <div className="flex justify-center space-x-3">
        <button
          onClick={downloadQR}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download QR Code
        </button>
        
        <button
          onClick={generateQR}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>Show this QR code at building security for guest access</p>
      </div>
    </div>
  );
}