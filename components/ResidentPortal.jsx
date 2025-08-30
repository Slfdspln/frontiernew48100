'use client';

import { useState, useEffect } from 'react';
import GuestManagement from './GuestManagement';

export default function ResidentPortal() {
  const [status, setStatus] = useState({ loading: true, isResident: null });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/reverify', { method: 'POST' });
        setStatus({ loading: false, isResident: r.ok ? (await r.json()).isResident : null });
      } catch {
        setStatus({ loading: false, isResident: null });
      }
    })();
  }, []);

  if (status.loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-white">Checking resident status…</div>
    </div>
  );

  if (!status.isResident) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto px-6">
        <div className="text-blue-400 text-lg">🔐 Login Required</div>
        <p className="text-gray-300">
          You must log in to access the resident portal.
        </p>
        <div className="space-y-2">
          <button 
            onClick={() => window.location.href = '/resident/login'}
            className="block mx-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
          <p className="text-sm text-gray-400">
            Regular credentials work for now. Admin login will be added later.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pt-24 px-6 space-y-6">
        <div className="text-center">
          <div className="text-green-400 text-lg mb-2">✓ Verified Resident</div>
          <p className="text-gray-300">Welcome to your resident portal</p>
        </div>
        
        <GuestManagement />
      </div>
    </div>
  );
}
