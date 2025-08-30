'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Users, BarChart3, QrCode, ClipboardList, Home, Scan } from 'lucide-react';
import QRScanner from './QRScanner';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: metrics } = useSWR('/api/admin/metrics', fetcher, {
    refreshInterval: 10000
  });
  const { data: recentActivity } = useSWR('/api/admin/recent-activity', fetcher, {
    refreshInterval: 15000,
    onError: (error) => console.error('Recent activity API error:', error),
    fallbackData: { activities: [] }
  });
  const { data: guestPassesData, error: guestPassesError } = useSWR('/api/admin/guest-passes', fetcher, {
    refreshInterval: 30000,
    onError: (error) => console.error('Guest passes API error:', error),
    fallbackData: []
  });
  const { data: residentsData, error: residentsError } = useSWR('/api/admin/residents', fetcher, {
    refreshInterval: 60000,
    onError: (error) => console.error('Residents API error:', error),
    fallbackData: []
  });
  const { data: usersData, error: usersError } = useSWR('/api/admin/users', fetcher, {
    refreshInterval: 60000,
    onError: (error) => console.error('Users API error:', error),
    fallbackData: []
  });

  if (!metrics) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'passes', label: 'Guest Passes', icon: ClipboardList },
    { id: 'residents', label: 'Residents', icon: Users },
    { id: 'users', label: 'Users', icon: BarChart3 },
    { id: 'scanner', label: 'QR Scanner', icon: Scan }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Complete guest pass management system</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Guests</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.inBuilding || 0}</p>
                    <p className="text-xs text-gray-500">Currently in building</p>
                  </div>
                  <div className="ml-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Today's Entries</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.checkedInToday || 0}</p>
                    <p className="text-xs text-gray-500">Guests checked in today</p>
                  </div>
                  <div className="ml-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending Arrivals</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.scheduledToday || 0}</p>
                    <p className="text-xs text-gray-500">Scheduled for today</p>
                  </div>
                  <div className="ml-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Passes</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.totalPasses || 0}</p>
                    <p className="text-xs text-gray-500">All time passes issued</p>
                  </div>
                  <div className="ml-4">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab('scanner')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan QR Code
                </button>
                <button
                  onClick={() => setActiveTab('passes')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  View All Passes
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Resident Activity
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity?.activities && recentActivity.activities.length > 0 ? (
                  recentActivity.activities.map((activity, index) => {
                    const getActivityColor = (type) => {
                      switch (type) {
                        case 'check_in': return 'bg-green-500';
                        case 'check_out': return 'bg-red-500';
                        case 'created': return 'bg-blue-500';
                        default: return 'bg-gray-500';
                      }
                    };

                    const timeAgo = (timestamp) => {
                      const now = new Date();
                      const then = new Date(timestamp);
                      const diffInMinutes = Math.floor((now - then) / (1000 * 60));
                      
                      if (diffInMinutes < 1) return 'Just now';
                      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
                      
                      const diffInHours = Math.floor(diffInMinutes / 60);
                      if (diffInHours < 24) return `${diffInHours}h ago`;
                      
                      const diffInDays = Math.floor(diffInHours / 24);
                      return `${diffInDays}d ago`;
                    };

                    return (
                      <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type)}`}></div>
                          <span className="text-sm text-gray-900 font-medium">{activity.message}</span>
                          <span className="text-sm text-gray-500">{activity.guestName}</span>
                        </div>
                        <span className="text-xs text-gray-400">{timeAgo(activity.timestamp)}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guest Passes Tab */}
        {activeTab === 'passes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Guest Pass Management</h2>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Create New Pass
              </button>
            </div>
            
            {guestPassesData && guestPassesData.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Date</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Array.isArray(guestPassesData) ? guestPassesData.map((pass, idx) => (
                      <tr key={pass.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="py-4 px-6 text-sm font-medium text-gray-900">{pass.guest_name}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{pass.resident_name}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pass.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                            pass.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            pass.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {pass.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">{new Date(pass.visit_date).toLocaleDateString()}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{new Date(pass.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-6 text-sm">
                          <div className="flex space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                            <button className="text-red-600 hover:text-red-800 font-medium">Revoke</button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="py-8 px-6 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <ClipboardList className="w-12 h-12 text-gray-400" />
                            <span className="text-gray-500">{guestPassesError ? 'Error loading guest passes' : 'No guest passes found'}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="animate-pulse">
                  <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Loading guest passes...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Frontier Tower Resident Profiles</h2>
            
            {usersData && usersData.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Passes</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Frontier ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Array.isArray(usersData) ? usersData.map((resident, idx) => (
                      <tr key={resident.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            {resident.profile_image ? (
                              <img 
                                src={resident.profile_image} 
                                alt="Profile" 
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
                                {resident.name?.split(' ').map(n => n[0]).join('').toUpperCase() || resident.email?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{resident.name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">
                                ID: {resident.id} • {resident.role || 'Resident'}
                              </div>
                              {resident.community && (
                                <div className="text-xs text-blue-600">{resident.community}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-900">{resident.unit_number || 'N/A'}</td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>{resident.email || 'N/A'}</div>
                            {resident.phone && (
                              <div className="text-xs text-gray-500">{resident.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            resident.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {resident.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          <span className="font-medium">{resident.monthly_guest_count || 0}</span>
                          <span className="text-gray-400"> / 3 this month</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            <div className="font-medium">{resident.frontier_user_id || 'N/A'}</div>
                            <div className="text-xs text-gray-400">
                              {resident.created_at ? new Date(resident.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="py-8 px-6 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Users className="w-12 h-12 text-gray-400" />
                            <span className="text-gray-500">{usersError ? 'Error loading residents' : 'No residents found'}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="animate-pulse">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Loading residents...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QR Scanner Tab */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">QR Code Scanner</h2>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <QRScanner />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
