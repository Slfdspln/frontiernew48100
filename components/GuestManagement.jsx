'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import AppleWalletButton from './AppleWalletButton';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function GuestManagement() {
  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    floor: '',
    isDelivery: false
  });
  const [msg, setMsg] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  // Removed guest passes fetching - residents don't see history, only admin does

  useEffect(() => {
    // Fetch CSRF token
    fetch('/api/csrf')
      .then(r => r.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => {});
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    setMsg('Registering guest...');

    try {
      const response = await fetch('/api/guest/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify(inviteData)
      });

      const result = await response.json();
      
      if (result.ok) {
        setMsg(`Guest registered! Share this verification link: ${result.verificationLink}`);
        setInviteData({ firstName: '', lastName: '', phoneNumber: '', floor: '', isDelivery: false });
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
      } else {
        setMsg(result.error || 'Action failed');
      }
    } catch (error) {
      setMsg('Network error. Please try again.');
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'checked_in': return 'text-green-600';
      case 'canceled': return 'text-red-600';
      case 'expired': return 'text-gray-500';
      default: return 'text-gray-900';
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"' }}>
      <div className="max-w-[600px] mx-auto p-8">
        {/* Frontier Tower branded form */}
        <div 
          className="bg-white rounded-3xl p-8 mx-auto"
          style={{
            boxShadow: 'rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px'
          }}
        >
          <div className="text-center mb-8">
            <h2 
              className="text-5xl font-black mb-4"
              style={{ 
                color: 'rgb(23, 23, 23)',
                fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                fontWeight: '900',
                letterSpacing: '-0.02em'
              }}
            >
              Register Guest
            </h2>
            <p 
              className="text-lg leading-relaxed max-w-md mx-auto"
              style={{ 
                color: 'rgb(102, 102, 102)',
                fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                fontWeight: '400'
              }}
            >
              Submit your guest details in a few easy steps. <strong style={{ fontWeight: '700', color: 'rgb(23, 23, 23)' }}>Verification link will be generated instantly</strong>, and your guest will receive access instructions.
            </p>
          </div>
          
          <form onSubmit={handleInvite} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label 
                  className="block text-sm font-bold mb-2"
                  style={{ 
                    color: 'rgb(23, 23, 23)',
                    fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                    fontWeight: '700'
                  }}
                >
                  First Name
                </label>
                <input
                  className="w-full h-11 px-4 text-sm border border-white rounded-full focus:outline-none focus:ring-3 transition-all duration-150"
                  style={{
                    backgroundColor: 'rgb(238, 238, 238)',
                    color: 'rgb(0, 0, 0)',
                    fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(118, 74, 226)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(118, 74, 226, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgb(255, 255, 255)';
                    e.target.style.boxShadow = 'none';
                  }}
                  type="text"
                  placeholder="First Name"
                  value={inviteData.firstName}
                  onChange={e => setInviteData({...inviteData, firstName: e.target.value})}
                  required
                />
              </div>
              <div>
                <label 
                  className="block text-sm font-bold mb-2"
                  style={{ 
                    color: 'rgb(23, 23, 23)',
                    fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                    fontWeight: '700'
                  }}
                >
                  Last Name
                </label>
                <input
                  className="w-full h-11 px-4 text-sm border border-white rounded-full focus:outline-none focus:ring-3 transition-all duration-150"
                  style={{
                    backgroundColor: 'rgb(238, 238, 238)',
                    color: 'rgb(0, 0, 0)',
                    fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(118, 74, 226)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(118, 74, 226, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgb(255, 255, 255)';
                    e.target.style.boxShadow = 'none';
                  }}
                  type="text"
                  placeholder="Last Name"
                  value={inviteData.lastName}
                  onChange={e => setInviteData({...inviteData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div>
              <label 
                className="block text-sm font-bold mb-2"
                style={{ 
                  color: 'rgb(23, 23, 23)',
                  fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                  fontWeight: '700'
                }}
              >
                Phone Number
              </label>
              <input
                className="w-full h-11 px-4 text-sm border border-white rounded-full focus:outline-none focus:ring-3 transition-all duration-150"
                style={{
                  backgroundColor: 'rgb(238, 238, 238)',
                  color: 'rgb(0, 0, 0)',
                  fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgb(118, 74, 226)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(118, 74, 226, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgb(255, 255, 255)';
                  e.target.style.boxShadow = 'none';
                }}
                type="tel"
                placeholder="Phone Number"
                value={inviteData.phoneNumber}
                onChange={e => setInviteData({...inviteData, phoneNumber: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label 
                className="block text-sm font-bold mb-2"
                style={{ 
                  color: 'rgb(23, 23, 23)',
                  fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                  fontWeight: '700'
                }}
              >
                Floor Access
              </label>
              <select
                className="w-full h-11 px-4 text-sm border border-white rounded-full focus:outline-none focus:ring-3 transition-all duration-150 appearance-none bg-no-repeat bg-right"
                style={{
                  backgroundColor: 'rgb(238, 238, 238)',
                  color: 'rgb(0, 0, 0)',
                  fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(102, 102, 102)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276,9 12,15 18,9%27%3e%3c/polyline%3e%3c/svg%3e")',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px 16px',
                  paddingRight: '40px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgb(118, 74, 226)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(118, 74, 226, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgb(255, 255, 255)';
                  e.target.style.boxShadow = 'none';
                }}
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
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isDelivery"
                checked={inviteData.isDelivery}
                onChange={e => setInviteData({...inviteData, isDelivery: e.target.checked})}
                className="h-5 w-5 rounded border-2 border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                style={{ accentColor: 'rgb(118, 74, 226)' }}
              />
              <label 
                htmlFor="isDelivery" 
                className="text-sm font-bold cursor-pointer"
                style={{ 
                  color: 'rgb(23, 23, 23)',
                  fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                  fontWeight: '700'
                }}
              >
                This is a delivery person
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full h-12 text-base font-bold rounded-xl transition-all duration-150 transform hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'rgb(118, 74, 226)',
                  color: 'rgb(255, 255, 255)',
                  fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                  fontWeight: '700',
                  boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px',
                  border: '1px solid rgb(235, 229, 251)',
                  letterSpacing: '0.01em'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgb(106, 66, 203)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgb(118, 74, 226)';
                }}
              >
                Generate Verification Link
              </button>
            </div>
          </form>
          
          {msg && (
            <div 
              className="mt-6 p-4 rounded-2xl"
              style={{
                backgroundColor: msg.includes('Failed') ? 'rgb(254, 242, 242)' : 'rgb(240, 253, 244)',
                border: msg.includes('Failed') ? '1px solid rgb(252, 165, 165)' : '1px solid rgb(167, 243, 208)'
              }}
            >
              {msg.includes('Guest registered!') ? (
                <div>
                  <p 
                    className="text-sm font-bold mb-3"
                    style={{
                      color: 'rgb(22, 163, 74)',
                      fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                      fontWeight: '700'
                    }}
                  >
                    ✅ Guest registered successfully!
                  </p>
                  <p 
                    className="text-xs font-medium mb-2"
                    style={{
                      color: 'rgb(22, 163, 74)',
                      fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"'
                    }}
                  >
                    Share this verification link with your guest:
                  </p>
                  <div 
                    className="p-2 rounded-lg border"
                    style={{
                      backgroundColor: 'rgb(255, 255, 255)',
                      border: '1px solid rgb(167, 243, 208)'
                    }}
                  >
                    <p 
                      className="text-xs font-mono break-all select-all cursor-pointer"
                      style={{
                        color: 'rgb(59, 130, 246)',
                        fontFamily: 'monospace'
                      }}
                      onClick={() => {
                        const link = msg.split(': ')[1];
                        navigator.clipboard.writeText(link);
                        alert('Link copied to clipboard!');
                      }}
                    >
                      {msg.split(': ')[1]}
                    </p>
                  </div>
                  <p 
                    className="text-xs mt-2 text-center"
                    style={{
                      color: 'rgb(102, 102, 102)',
                      fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"'
                    }}
                  >
                    💡 Click the link above to copy it
                  </p>
                </div>
              ) : (
                <p 
                  className="text-sm font-bold"
                  style={{
                    color: msg.includes('Failed') ? 'rgb(239, 68, 68)' : 'rgb(22, 163, 74)',
                    fontFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"',
                    fontWeight: '700'
                  }}
                >
                  {msg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
