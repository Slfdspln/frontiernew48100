'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import AppleWalletButton from './AppleWalletButton';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function GuestManagement() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    guestEmail: '',
    visitDate: '',
    floor: ''
  });
  const [msg, setMsg] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  // Fetch guest passes for this resident
  const { data: passes, error, mutate } = useSWR('/api/resident/passes', fetcher, {
    refreshInterval: 10000 // Refresh every 10 seconds
  });

  useEffect(() => {
    // Fetch CSRF token
    fetch('/api/csrf')
      .then(r => r.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => {});
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    setMsg('Sending invite...');

    try {
      const response = await fetch('/api/guest/invite', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify(inviteData)
      });

      const result = await response.json();
      
      if (result.ok) {
        setMsg('Invite sent! Guest will receive completion link.');
        setShowInviteForm(false);
        setInviteData({ guestEmail: '', visitDate: '', floor: '' });
        mutate(); // Refresh passes list
      } else {
        setMsg(result.error || 'Failed to send invite');
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
  }

  async function handleApprove(passId, approve) {
    try {
      const response = await fetch('/api/guest/approve', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ passId, approve })
      });

      const result = await response.json();
      
      if (result.ok) {
        setMsg(approve ? 'Pass approved!' : 'Pass declined.');
        mutate(); // Refresh passes list
      } else {
        setMsg(result.error || 'Action failed');
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'scheduled': return 'text-green-400';
      case 'checked_in': return 'text-blue-400';
      case 'canceled': return 'text-red-400';
      case 'expired': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Guest Management</h2>
        <button
          onClick={() => setShowInviteForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Invite Guest
        </button>
      </div>

      {showInviteForm && (
        <div className="bg-black/40 border border-white/10 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">Invite New Guest</h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <input
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white"
              type="email"
              placeholder="Guest Email"
              value={inviteData.guestEmail}
              onChange={e => setInviteData({...inviteData, guestEmail: e.target.value})}
              required
            />
            
            <input
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white"
              type="date"
              min={minDate}
              value={inviteData.visitDate}
              onChange={e => setInviteData({...inviteData, visitDate: e.target.value})}
              required
            />
            
            <select
              className="w-full p-2 rounded bg-black/40 border border-white/10 text-white"
              value={inviteData.floor}
              onChange={e => setInviteData({...inviteData, floor: e.target.value})}
              required
            >
              <option value="">Select Floor</option>
              <option value="Lobby">Lobby</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
              <option value="4">Floor 4</option>
              <option value="5">Floor 5</option>
            </select>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Send Invite
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Guest Passes List */}
      <div className="bg-black/40 border border-white/10 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-4">Your Guest Passes</h3>
        
        {error && <p className="text-red-400">Failed to load passes</p>}
        
        {passes && passes.length === 0 && (
          <p className="text-gray-400">No guest passes yet. Invite your first guest!</p>
        )}
        
        {passes && passes.length > 0 && (
          <div className="space-y-3">
            {passes.map(pass => (
              <div key={pass.id} className="bg-black/20 border border-white/5 rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium">
                      {pass.guests?.first_name} {pass.guests?.last_name}
                    </p>
                    <p className="text-sm text-gray-300">{pass.guests?.email}</p>
                    <p className="text-sm text-gray-400">
                      {pass.visit_date} • Floor {pass.floor}
                    </p>
                    <p className={`text-sm font-medium ${getStatusColor(pass.status)}`}>
                      {pass.status.charAt(0).toUpperCase() + pass.status.slice(1)}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                    {pass.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(pass.id, true)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprove(pass.id, false)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    
                    {pass.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => window.open(`/passes/${pass.id}/qr`, '_blank')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          View QR
                        </button>
                        <AppleWalletButton 
                          passId={pass.id}
                          guestName={pass.guest_name || pass.guests?.first_name + ' ' + pass.guests?.last_name}
                          className="text-sm px-3 py-1 h-auto w-auto"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {msg && <p className="text-sm text-gray-300">{msg}</p>}
    </div>
  );
}
