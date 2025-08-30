'use client';

import { useState, useEffect } from 'react';
import { QrCode } from 'lucide-react';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // Fetch CSRF token
    fetch('/api/csrf')
      .then(r => r.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => {});
  }, []);

  async function handleManualScan() {
    const token = prompt('Enter QR token for manual verification:');
    if (!token) return;

    await verifyToken(token);
  }

  async function verifyToken(token) {
    setScanning(true);
    setMsg('Verifying...');

    try {
      const response = await fetch('/api/admin/verify-qr', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();
      
      if (result.ok) {
        setScanResult({
          success: true,
          pass: result.pass,
          message: result.message || 'Check-in successful!'
        });
        setMsg('');
      } else {
        setScanResult({
          success: false,
          error: result.error,
          message: result.message
        });
        setMsg('');
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
      setScanResult(null);
    }
    
    setScanning(false);
  }

  function resetScan() {
    setScanResult(null);
    setMsg('');
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
      {!scanResult && (
        <div className="space-y-6">
          <div>
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code Scanner</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enter QR token manually for verification
            </p>
          </div>
          
          <button
            onClick={handleManualScan}
            disabled={scanning}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {scanning ? 'Verifying...' : 'Manual Token Entry'}
          </button>
          
          {msg && <p className="text-sm text-gray-600 mt-4">{msg}</p>}
        </div>
      )}

      {scanResult && (
        <div className="space-y-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              scanResult.success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <div className={`text-2xl ${
                scanResult.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {scanResult.success ? '✓' : '✗'}
              </div>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${
              scanResult.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {scanResult.success ? 'Access Granted' : 'Access Denied'}
            </h3>
          </div>

          {scanResult.pass && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Guest:</span>
                  <span className="text-gray-900 font-medium">
                    {scanResult.pass.guests?.first_name} {scanResult.pass.guests?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Host:</span>
                  <span className="text-gray-900 font-medium">
                    {scanResult.pass.residents?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Floor:</span>
                  <span className="text-gray-900">{scanResult.pass.floor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit Date:</span>
                  <span className="text-gray-900">{scanResult.pass.visit_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="text-gray-900 capitalize">{scanResult.pass.status}</span>
                </div>
                {scanResult.pass.checked_in_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Checked In:</span>
                    <span className="text-gray-900">
                      {new Date(scanResult.pass.checked_in_at).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {scanResult.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{scanResult.error}</p>
              {scanResult.message && (
                <p className="text-red-600 text-sm mt-1">{scanResult.message}</p>
              )}
            </div>
          )}

          <button
            onClick={resetScan}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
}
