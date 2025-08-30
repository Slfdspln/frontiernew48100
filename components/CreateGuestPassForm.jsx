'use client';

import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function CreateGuestPassForm({ onSuccess, user }) {
  const [csrfToken, setCsrfToken] = useState('');
  const [formData, setFormData] = useState({
    // Host info (auto-filled)
    hostName: user?.name || '',
    hostEmail: user?.email || '',
    hostPhone: user?.phone || '',
    hostUnit: user?.unit_number || '',
    
    // Guest info
    guestLegalName: '',
    guestEmail: '',
    guestPhone: '',
    
    // Visit details
    visitDate: null, // Change to Date object for calendar
    
    // Access details
    purposeOfVisit: 'personal',
    floorAccess: '', // Specific floor access
    specialEquipment: '',
    
    // Additional notes
    specialInstructions: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Fetch CSRF token on component mount
  useEffect(() => {
    fetch('/api/csrf')
      .then(r => r.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(() => {});
  }, []);

  // Auto-fill host information when user data is available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        hostName: user.name || '',
        hostEmail: user.email || '',
        hostPhone: user.phone || '',
        hostUnit: user.unit_number || ''
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessData(null);

    // Validate visit date is selected
    if (!formData.visitDate) {
      setError('Please select a visit date');
      setLoading(false);
      return;
    }

    try {
      // Format phone number if provided
      let formattedPhone = undefined;
      if (formData.guestPhone) {
        const cleanPhone = formData.guestPhone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
          formattedPhone = '+1' + cleanPhone;
        } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
          formattedPhone = '+' + cleanPhone;
        } else {
          setError('Guest phone must be 10 digits (US format)');
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/guest/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          // Map to existing API format for now
          guestEmail: formData.guestEmail,
          guestPhone: formattedPhone,
          guestName: formData.guestLegalName,
          visitDate: formData.visitDate ? format(formData.visitDate, 'yyyy-MM-dd') : '',
          floor: formData.floorAccess || 'TBD',
          
          // Extended data for QR code - ALL guest information for admin verification
          extendedData: {
            hostName: formData.hostName,
            hostPhone: formData.hostPhone,
            hostEmail: formData.hostEmail,
            guestName: formData.guestLegalName,
            guestEmail: formData.guestEmail,
            guestPhone: formData.guestPhone,
            visitDate: formData.visitDate ? format(formData.visitDate, 'yyyy-MM-dd') : '',
            visitDateFormatted: formData.visitDate ? format(formData.visitDate, 'MMMM d, yyyy') : '',
            purposeOfVisit: formData.purposeOfVisit,
            floorAccess: formData.floorAccess,
            specialEquipment: formData.specialEquipment || 'None',
            specialInstructions: formData.specialInstructions || 'None',
            createdAt: new Date().toISOString(),
            passType: 'guest_access'
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessData(data);
        // Don't reset form immediately so user can see the success message
      } else {
        setError(data.error || 'Failed to create guest pass');
      }
    } catch (error) {
      console.error('Create pass error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(prev => ({
      ...prev,
      guestLegalName: '',
      guestEmail: '',
      guestPhone: '',
      visitDate: null,
      purposeOfVisit: 'personal',
      floorAccess: '',
      specialEquipment: '',
      specialInstructions: ''
    }));
    setSuccessData(null);
    setError('');
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const purposeOptions = [
    { value: 'delivery', label: 'Delivery' },
    { value: 'vendor', label: 'Vendor/Contractor' },
    { value: 'personal', label: 'Personal Guest' },
    { value: 'real_estate', label: 'Real Estate Showing' },
    { value: 'service', label: 'Service/Maintenance' },
    { value: 'moving', label: 'Moving' },
    { value: 'other', label: 'Other' }
  ];

  const floorAccessOptions = [
    { value: 'lobby', label: 'Lobby Only' },
    { value: 'longevity-ai', label: 'Longevity AI Floor' },
    { value: 'coworking-2', label: 'Co-working Floor 2' },
    { value: 'coworking-3', label: 'Co-working Floor 3' },
    { value: 'residential-4', label: 'Residential Floor 4' },
    { value: 'residential-5', label: 'Residential Floor 5' },
    { value: 'residential-6', label: 'Residential Floor 6' },
    { value: 'amenities', label: 'Amenities Floor' },
    { value: 'rooftop', label: 'Rooftop Access' },
    { value: 'event', label: 'Event Space' },
    { value: 'parking', label: 'Parking Garage' }
  ];

  if (successData) {
    return (
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-green-900 mb-4">
              Guest Pass Created Successfully!
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white border border-green-200 rounded p-4">
                <p className="text-sm text-gray-600 mb-2">Guest Pass ID:</p>
                <p className="font-mono text-sm text-gray-900">{successData.passId}</p>
              </div>

              {successData.method === 'sms' ? (
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-green-800 mb-2">{successData.message}</p>
                  <p>The guest will receive an SMS with instructions to complete their registration.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">
                    Share this link with your guest to complete registration:
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">Registration Link:</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={successData.completionLink}
                        className="flex-1 text-sm font-mono bg-white border border-gray-300 rounded px-2 py-1"
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(successData.completionLink);
                          alert('Link copied to clipboard!');
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex space-x-3">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  Create Another Pass
                </button>
                <button
                  onClick={onSuccess}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-md"
                >
                  View All Passes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Create Guest Pass
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Generate a secure access pass for your guest
          </p>
        </div>
        
        <div className="px-6 py-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Host Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Host Information</h4>
                <div className="ml-4 flex-1 border-t border-gray-200"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="hostName" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Host Name *
                  </label>
                  <input
                    type="text"
                    id="hostName"
                    required
                    value={formData.hostName}
                    onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label htmlFor="hostPhone" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Host Phone
                  </label>
                  <input
                    type="tel"
                    id="hostPhone"
                    value={formData.hostPhone}
                    onChange={(e) => setFormData({ ...formData, hostPhone: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="+1 (123) 456-7890"
                  />
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Guest Information</h4>
                <div className="ml-4 flex-1 border-t border-gray-200"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guestLegalName" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    id="guestLegalName"
                    required
                    value={formData.guestLegalName}
                    onChange={(e) => setFormData({ ...formData, guestLegalName: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label htmlFor="guestEmail" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Guest Email *
                  </label>
                  <input
                    type="email"
                    id="guestEmail"
                    required
                    value={formData.guestEmail}
                    onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="guest@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="guestPhone" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Guest Phone
                  </label>
                  <input
                    type="tel"
                    id="guestPhone"
                    value={formData.guestPhone}
                    onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="+1 (123) 456-7890"
                  />
                </div>
                <div>
                  <label htmlFor="purposeOfVisit" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Purpose of Visit *
                  </label>
                  <select
                    id="purposeOfVisit"
                    required
                    value={formData.purposeOfVisit}
                    onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  >
                    {purposeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="space-y-4">
              <div className="flex items-center">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Visit Details</h4>
                <div className="ml-4 flex-1 border-t border-gray-200"></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Visit Date *
                  </label>
                  <div className="inline-block border border-gray-300 rounded-lg p-2 bg-white">
                    <Calendar
                      mode="single"
                      selected={formData.visitDate}
                      onSelect={(date) => setFormData({ ...formData, visitDate: date })}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const checkDate = new Date(date);
                        checkDate.setHours(0, 0, 0, 0);
                        return checkDate < today;
                      }}
                      className="rounded-md border-0 text-sm"
                      classNames={{
                        months: "flex flex-col space-y-2",
                        month: "space-y-2",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-xs font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 text-xs",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse",
                        head_row: "flex",
                        head_cell: "text-gray-500 rounded-md w-8 font-normal text-[0.7rem]",
                        row: "flex w-full mt-1",
                        cell: "text-center text-xs p-0 relative",
                        day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md text-xs",
                        day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                        day_today: "bg-gray-100 text-gray-900 font-medium",
                        day_outside: "text-gray-400 opacity-50",
                        day_disabled: "text-gray-400 opacity-50 cursor-not-allowed",
                        day_hidden: "invisible",
                      }}
                    />
                  </div>
                  {formData.visitDate && (
                    <p className="mt-2 text-xs text-gray-600">
                      {format(formData.visitDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="floorAccess" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Floor Access *
                  </label>
                  <select
                    id="floorAccess"
                    required
                    value={formData.floorAccess}
                    onChange={(e) => setFormData({ ...formData, floorAccess: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="">Select floor access</option>
                    {floorAccessOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <div className="flex items-center">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Additional Information</h4>
                <div className="ml-4 flex-1 border-t border-gray-200"></div>
              </div>
              <div className="space-y-3">
                <div>
                  <label htmlFor="specialEquipment" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Special Equipment (optional)
                  </label>
                  <textarea
                    id="specialEquipment"
                    rows={2}
                    value={formData.specialEquipment}
                    onChange={(e) => setFormData({ ...formData, specialEquipment: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Tools, packages, equipment..."
                  />
                </div>
                <div>
                  <label htmlFor="specialInstructions" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Special Instructions (optional)
                  </label>
                  <textarea
                    id="specialInstructions"
                    rows={2}
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Additional information for security..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-w-[140px]"
              >
                {loading ? 'Creating...' : 'Create Guest Pass'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}