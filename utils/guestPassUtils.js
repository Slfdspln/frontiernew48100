/**
 * Utility functions for handling guest passes
 */

// Generate a unique pass code for guest passes
export const generatePassCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 8;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

// Format date to display in a user-friendly format
export const formatDate = (dateString) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Check if a date is in the future
export const isFutureDate = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  return date >= today;
};

// Check if a date is today
export const isToday = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
};

// Calculate remaining passes for a resident
export const calculateRemainingPasses = (resident, guestPasses) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Filter passes for the current month that are not cancelled
  const usedPassesThisMonth = guestPasses.filter(pass => {
    const passDate = new Date(pass.visitDate);
    return (
      pass.residentId === resident.id &&
      passDate.getMonth() === currentMonth &&
      passDate.getFullYear() === currentYear &&
      pass.status !== 'cancelled'
    );
  });
  
  // Each resident gets 3 passes per month
  return 3 - usedPassesThisMonth.length;
};

// Get the current month name
export const getCurrentMonthName = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[new Date().getMonth()];
};

// Format time to display in a user-friendly format
export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Calculate days remaining until a visit
export const daysUntilVisit = (visitDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visit = new Date(visitDate);
  visit.setHours(0, 0, 0, 0);
  
  const diffTime = visit - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Get pass status color for UI display
export const getPassStatusColor = (status) => {
  switch (status) {
    case 'approved':
      return 'bg-green-500';
    case 'pending':
      return 'bg-yellow-500';
    case 'rejected':
      return 'bg-red-500';
    case 'used':
      return 'bg-blue-500';
    case 'cancelled':
      return 'bg-gray-500';
    default:
      return 'bg-gray-300';
  }
};

// Get pass status text for UI display
export const getPassStatusText = (status) => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'pending':
      return 'Pending Approval';
    case 'rejected':
      return 'Rejected';
    case 'used':
      return 'Used';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};
