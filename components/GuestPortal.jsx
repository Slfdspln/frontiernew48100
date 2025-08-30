"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import CanvasRevealEffect to avoid SSR issues
const CanvasRevealEffect = dynamic(() => import("../CanvasRevealEffect").then(mod => ({ default: mod.CanvasRevealEffect })), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" />
});

// Dynamically import validatePassCode to avoid SSR issues
const validatePassCode = async (code) => {
  if (typeof window === 'undefined') return { valid: false, message: 'Server-side validation not available' };
  const { validatePassCode: validate } = await import("../utils/qrCodeUtils");
  return validate(code);
};

const GuestPortal = () => {
  const [passCode, setPassCode] = useState("");
  const [step, setStep] = useState("verify");
  const [guestInfo, setGuestInfo] = useState(null);
  const [error, setError] = useState("");

  const handleVerifyPass = async (e) => {
    e.preventDefault();
    setError("");
    
    const code = passCode.trim();
    if (!code) {
      setError("Please enter a pass code.");
      return;
    }
    
    const result = await validatePassCode(code);
    if (result.valid) {
      const pass = result.pass;
      // Map DB fields to UI expectations
      setGuestInfo({
        id: pass.id,
        guestName: pass.guest_name || pass.guestName || "Guest",
        residentName: pass.resident_name || pass.residentName || "Resident",
        apartmentNumber: pass.apartment || pass.apartment_number || "",
        date: pass.visit_date || pass.date,
        status: pass.status || "approved",
        email: pass.email || "",
        notes: pass.notes || "",
      });
      setStep("success");
    } else {
      setError(result.message || "Invalid pass code. Please try again.");
    }
  };

  const handleScanAgain = () => {
    setPassCode("");
    setGuestInfo(null);
    setStep("verify");
  };

  return (
    <div className="flex w-full flex-col min-h-screen bg-white relative">
      {/* Removed background effect for clean white background */}

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 pt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto w-full">
          <AnimatePresence mode="wait">
            {step === "verify" ? (
              <motion.div
                key="verify-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white shadow-lg border border-gray-200 rounded-xl p-6"
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Guest Pass Verification</h1>
                  <p className="text-gray-600 mt-2">
                    Enter your pass code or scan the QR code provided by the resident
                  </p>
                </div>

                <form onSubmit={handleVerifyPass} className="space-y-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Pass ID</label>
                    <input
                      type="text"
                      value={passCode}
                      onChange={(e) => setPassCode(e.target.value)}
                      placeholder="e.g. 3f3a1b2c-4d5e-6f70-8901-23456789abcd"
                      className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Verify Pass
                    </button>
                  </div>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-600 text-sm">Enter the exact Pass ID shown in the resident's QR modal, or</p>
                  <a href="/verify" className="inline-block mt-4 px-6 py-3 bg-gray-100 border border-gray-300 text-gray-900 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                    Scan QR Code
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white shadow-lg border border-gray-200 rounded-xl p-6"
              >
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-black"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Pass Verified</h1>
                  <p className="text-green-600 mt-1">Your guest pass is valid</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Guest Name:</span>
                      <span className="text-gray-900 font-medium">{guestInfo?.guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resident:</span>
                      <span className="text-gray-900 font-medium">{guestInfo?.residentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Apartment:</span>
                      <span className="text-gray-900 font-medium">{guestInfo?.apartmentNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valid Date:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(guestInfo?.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-600 text-sm mb-4">
                    Please show this screen to the security personnel at the entrance
                  </p>
                  <button
                    onClick={handleScanAgain}
                    className="px-6 py-3 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Scan Another Pass
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GuestPortal;
