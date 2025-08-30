'use client';

import { useState } from 'react';
import { Smartphone, Shield, User } from 'lucide-react';

export default function AppleWalletButton({ passId, guestName, onError, onSuccess, className }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const handleGeneratePass = async () => {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/apple-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate pass');
      }
      
      // Download the pass file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FrontierTower_${(guestName || 'Guest').replace(/\s+/g, '_')}_Pass.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      onSuccess && onSuccess();
      
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      setError(error.message);
      onError && onError(error.message);
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <div className="space-y-3">
      <button
        onClick={handleGeneratePass}
        disabled={generating}
        className={`w-full bg-black text-white py-3 px-4 rounded-lg font-medium 
                   hover:bg-gray-800 transition-colors disabled:opacity-50 
                   disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      >
        {generating ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Generating Pass...
          </>
        ) : (
          <>
            <Smartphone className="h-4 w-4" />
            Add to Apple Wallet
          </>
        )}
      </button>
      
      {/* Security Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
          <Shield className="h-4 w-4" />
          Unique Guest Pass
        </div>
        <div className="text-blue-700 space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            Personal QR code for {guestName || 'Guest'}
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Cannot be shared or reused
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}
    </div>
  );
}