/**
 * Authentication utilities for the guest pass system
 */

import { mockResidents } from './mockData';

// Mock user types
export const USER_TYPES = {
  RESIDENT: 'resident',
  ADMIN: 'admin',
  GUEST: 'guest',
};

// Mock admin users
const mockAdmins = [
  {
    id: 'admin1',
    email: 'admin@frontiertower.com',
    password: 'admin123', // In a real app, this would be hashed
    name: 'Admin User',
    role: USER_TYPES.ADMIN,
  },
];

// Mock authentication function - in a real app, this would connect to a backend
export const authenticateUser = (email, password, userType) => {
  // For admin authentication
  if (userType === USER_TYPES.ADMIN) {
    const admin = mockAdmins.find(
      (admin) => admin.email === email && admin.password === password
    );
    
    if (admin) {
      return {
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      };
    }
  }
  
  // For resident authentication (using unit number as password in this mock)
  if (userType === USER_TYPES.RESIDENT) {
    const resident = mockResidents.find(
      (resident) => resident.email === email && resident.unit === password
    );
    
    if (resident) {
      return {
        success: true,
        user: {
          id: resident.id,
          name: resident.name,
          email: resident.email,
          unit: resident.unit,
          role: USER_TYPES.RESIDENT,
        },
      };
    }
  }
  
  // Authentication failed
  return {
    success: false,
    error: 'Invalid email or password',
  };
};

// Generate a session token (mock implementation)
export const generateSessionToken = (user) => {
  // In a real app, this would create a JWT or other secure token
  return btoa(JSON.stringify({
    userId: user.id,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours expiration
  }));
};

// Verify a session token (mock implementation)
export const verifySessionToken = (token) => {
  try {
    const decoded = JSON.parse(atob(token));
    
    // Check if token is expired
    if (decoded.exp < Date.now()) {
      return {
        valid: false,
        error: 'Token expired',
      };
    }
    
    return {
      valid: true,
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid token',
    };
  }
};

// Check if user has admin permissions
export const isAdmin = (user) => {
  return user && user.role === USER_TYPES.ADMIN;
};

// Check if user is a resident
export const isResident = (user) => {
  return user && user.role === USER_TYPES.RESIDENT;
};
