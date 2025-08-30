import Link from 'next/link';
import { GlowingEffect } from '../components/ui/glowing-effect';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold text-gray-900">
            Frontier Tower
          </h1>
          <p className="text-xl text-gray-700 font-medium">Complete Guest Pass Management System</p>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
            Secure, automated guest access with QR codes, real-time tracking, and comprehensive admin controls
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Resident Portal */}
          <div className="relative group">
            <GlowingEffect 
              disabled={false} 
              proximity={120} 
              spread={40} 
              blur={3}
              movementDuration={2}
            />
            <div className="bg-white shadow-lg border border-gray-200 rounded-2xl p-8 space-y-6 h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Resident Portal</h3>
                  <p className="text-gray-600 text-base leading-relaxed">
                    Create guest invites, manage passes, view QR codes, and track visitor status
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Send guest invitations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Generate QR codes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Track guest status</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Manage active passes</span>
                </div>
              </div>

              <Link href="/resident" className="block mt-auto">
                <div className="w-full bg-blue-600 hover:bg-blue-700 border border-blue-600 hover:border-blue-700 rounded-xl px-6 py-3 text-center text-white font-medium transition-all duration-200 cursor-pointer">
                  Access Resident Dashboard
                </div>
              </Link>
            </div>
          </div>

          {/* Guest Portal */}
          <div className="relative group">
            <GlowingEffect 
              disabled={false} 
              proximity={120} 
              spread={40} 
              blur={3}
              movementDuration={2}
            />
            <div className="bg-white shadow-lg border border-gray-200 rounded-2xl p-8 space-y-6 h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Guest Access</h3>
                  <p className="text-gray-600 text-base leading-relaxed">
                    Complete registration, verify passes, and access building with QR codes
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Complete guest registration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Verify pass codes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>View QR codes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Check-in status</span>
                </div>
              </div>

              <Link href="/guest" className="block mt-auto">
                <div className="w-full bg-blue-600 hover:bg-blue-700 border border-blue-600 hover:border-blue-700 rounded-xl px-6 py-3 text-center text-white font-medium transition-all duration-200 cursor-pointer">
                  Guest Portal Access
                </div>
              </Link>
            </div>
          </div>

          {/* Admin Portal */}
          <div className="relative group">
            <GlowingEffect 
              disabled={false} 
              proximity={120} 
              spread={40} 
              blur={3}
              movementDuration={2}
            />
            <div className="bg-white shadow-lg border border-gray-200 rounded-2xl p-8 space-y-6 h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Admin Control</h3>
                  <p className="text-gray-600 text-base leading-relaxed">
                    Monitor building access, scan QR codes, and manage all guest passes
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Real-time building metrics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>QR code scanner</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Guest pass management</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span>Resident activity tracking</span>
                </div>
              </div>

              <Link href="/admin" className="block mt-auto">
                <div className="w-full bg-blue-600 hover:bg-blue-700 border border-blue-600 hover:border-blue-700 rounded-xl px-6 py-3 text-center text-white font-medium transition-all duration-200 cursor-pointer">
                  Admin Dashboard
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* System Features */}
        <div className="relative">
          <GlowingEffect 
            disabled={false} 
            proximity={150} 
            spread={60} 
            blur={4}
            movementDuration={3}
          />
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10">
            <h3 className="text-2xl font-semibold text-gray-900 mb-8 text-center">System Features</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">QR Code Generation</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Real-time Tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Automated Workflows</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Secure Authentication</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Mobile Responsive</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Admin Analytics</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Email Notifications</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Database Integration</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-600 text-base mt-8">
          <p>Powered by Next.js 15, React 19, Supabase & Frontier API</p>
        </div>
      </div>
    </div>
  );
}
