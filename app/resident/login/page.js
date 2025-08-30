'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResidentLogin() {
  const router = useRouter();
  const [step, setStep] = useState('login'); // 'login' or 'code'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationMethod, setVerificationMethod] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !phone) {
      setError('Both email and phone number are required');
      setLoading(false);
      return;
    }

    // Format phone number to include +1 if missing
    let formattedPhone = phone.replace(/\D/g, ''); // Remove all non-digits
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+1')) {
      setError('Phone number must be 10 digits (US format)');
      setLoading(false);
      return;
    }

    try {
      const body = { email, phone: formattedPhone };

      const response = await fetch('/api/auth/resident/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationMethod(data.method);
        setStep('code');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resident/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/resident');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Frontier Tower
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          SMS Sign In & Registration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1234567890"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter 10-digit US phone number (will auto-format to +1)
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {loading ? 'Sending...' : 'Send SMS Code'}
                </button>
              </div>
            </form>
          )}

          {step === 'code' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">
                  Check your {verificationMethod === 'sms' ? 'phone' : 'email'}
                </h3>
                <p className="mt-2 text-sm text-gray-600 text-center">
                  We sent a 6-digit verification code to<br />
                  <span className="font-medium">
                    {verificationMethod === 'sms' ? phone : email}
                  </span>
                </p>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-6">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <div className="mt-1">
                    <input
                      id="code"
                      type="text"
                      required
                      maxLength="6"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                      placeholder="123456"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </div>

              </form>
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need Help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Only verified residents with active subscriptions can access the portal.
                <br />
                Contact building management for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}