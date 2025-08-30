'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import CreateGuestPassForm from '@/components/CreateGuestPassForm';

export default function ResidentPortal() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [passes, setPasses] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadPasses();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/resident/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/resident/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/resident/login');
    } finally {
      setLoading(false);
    }
  };

  const loadPasses = async () => {
    try {
      const response = await fetch('/api/resident/guest-passes');
      if (response.ok) {
        const data = await response.json();
        setPasses(data);
      }
    } catch (error) {
      console.error('Failed to load passes:', error);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-8">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Resident Portal</h1>
            <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}</p>
          </div>
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('create')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Create Pass
              </button>
              <button
                onClick={() => setActiveTab('passes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'passes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Guest Passes
              </button>
            </nav>
          </div>

          {activeTab === 'passes' && <PassesList passes={passes} onUpdate={loadPasses} />}
          {activeTab === 'create' && <CreateGuestPassForm user={user} onSuccess={() => { loadPasses(); setActiveTab('passes'); }} />}
        </div>
      </main>
    </div>
  );
}

function PassesList({ passes, onUpdate }) {
  const [selectedPassForQR, setSelectedPassForQR] = useState(null);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Your Guest Passes</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage and view your guest passes. You can create up to 3 passes per month.
        </p>
      </div>
      {passes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No guest passes yet. Create your first one!</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {passes.map((pass) => (
            <li key={pass.id}>
              <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {pass.guests?.first_name} {pass.guests?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{pass.guests?.email}</p>
                    <p className="text-sm text-gray-500">Visit Date: {pass.visit_date}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pass.status)}`}>
                      {pass.status}
                    </span>
                    {pass.status === 'scheduled' && (
                      <button
                        onClick={() => setSelectedPassForQR(pass)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Show QR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {selectedPassForQR && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Guest Pass QR Code</h2>
                <button
                  onClick={() => setSelectedPassForQR(null)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <QRCodeDisplay 
                passId={selectedPassForQR.id}
                guestName={`${selectedPassForQR.guests?.first_name} ${selectedPassForQR.guests?.last_name}`}
                scheduledDate={selectedPassForQR.visit_date}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

