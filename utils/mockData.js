/**
 * Mock data for the guest pass system
 */

// Mock residents data
export const mockResidents = [
  {
    id: 1,
    name: 'John Smith',
    unit: '101',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    moveInDate: '2023-01-15',
  },
  {
    id: 2,
    name: 'Emily Johnson',
    unit: '205',
    email: 'emily.johnson@example.com',
    phone: '(555) 234-5678',
    moveInDate: '2023-03-22',
  },
  {
    id: 3,
    name: 'Michael Brown',
    unit: '310',
    email: 'michael.brown@example.com',
    phone: '(555) 345-6789',
    moveInDate: '2022-11-05',
  },
  {
    id: 4,
    name: 'Sarah Davis',
    unit: '412',
    email: 'sarah.davis@example.com',
    phone: '(555) 456-7890',
    moveInDate: '2023-05-18',
  },
  {
    id: 5,
    name: 'David Wilson',
    unit: '507',
    email: 'david.wilson@example.com',
    phone: '(555) 567-8901',
    moveInDate: '2022-08-30',
  },
];

// Generate today's date and dates for the next few days
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfterTomorrow = new Date(today);
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

// Format date to YYYY-MM-DD string
const formatDateToString = (date) => {
  return date.toISOString().split('T')[0];
};

// Mock guest passes data
export const mockGuestPasses = [
  {
    id: 1,
    residentId: 1,
    guestName: 'Alice Thompson',
    guestEmail: 'alice@example.com',
    guestPhone: '(555) 111-2222',
    visitDate: formatDateToString(today),
    passCode: 'ABCD1234',
    status: 'approved',
    notes: 'Coming for dinner',
    createdAt: '2025-08-20T10:30:00',
  },
  {
    id: 2,
    residentId: 1,
    guestName: 'Bob Johnson',
    guestEmail: 'bob@example.com',
    guestPhone: '(555) 222-3333',
    visitDate: formatDateToString(tomorrow),
    passCode: 'EFGH5678',
    status: 'pending',
    notes: 'Staying overnight',
    createdAt: '2025-08-21T14:15:00',
  },
  {
    id: 3,
    residentId: 2,
    guestName: 'Carol Martinez',
    guestEmail: 'carol@example.com',
    guestPhone: '(555) 333-4444',
    visitDate: formatDateToString(dayAfterTomorrow),
    passCode: 'IJKL9012',
    status: 'approved',
    notes: '',
    createdAt: '2025-08-19T09:45:00',
  },
  {
    id: 4,
    residentId: 3,
    guestName: 'David Lee',
    guestEmail: 'david@example.com',
    guestPhone: '(555) 444-5555',
    visitDate: formatDateToString(nextWeek),
    passCode: 'MNOP3456',
    status: 'rejected',
    notes: 'Business meeting',
    createdAt: '2025-08-18T16:20:00',
  },
  {
    id: 5,
    residentId: 4,
    guestName: 'Eva Garcia',
    guestEmail: 'eva@example.com',
    guestPhone: '(555) 555-6666',
    visitDate: formatDateToString(today),
    passCode: 'QRST7890',
    status: 'used',
    notes: 'Family visit',
    createdAt: '2025-08-15T11:10:00',
  },
  {
    id: 6,
    residentId: 5,
    guestName: 'Frank Wilson',
    guestEmail: 'frank@example.com',
    guestPhone: '(555) 666-7777',
    visitDate: formatDateToString(tomorrow),
    passCode: 'UVWX1234',
    status: 'approved',
    notes: '',
    createdAt: '2025-08-17T13:25:00',
  },
  {
    id: 7,
    residentId: 2,
    guestName: 'Grace Kim',
    guestEmail: 'grace@example.com',
    guestPhone: '(555) 777-8888',
    visitDate: formatDateToString(today),
    passCode: 'YZAB5678',
    status: 'cancelled',
    notes: 'Birthday celebration',
    createdAt: '2025-08-16T15:40:00',
  },
];

// Mock system statistics
export const mockSystemStats = {
  totalResidents: mockResidents.length,
  totalGuestPasses: mockGuestPasses.length,
  pendingPasses: mockGuestPasses.filter(pass => pass.status === 'pending').length,
  approvedPasses: mockGuestPasses.filter(pass => pass.status === 'approved').length,
  rejectedPasses: mockGuestPasses.filter(pass => pass.status === 'rejected').length,
  usedPasses: mockGuestPasses.filter(pass => pass.status === 'used').length,
  cancelledPasses: mockGuestPasses.filter(pass => pass.status === 'cancelled').length,
  passesToday: mockGuestPasses.filter(pass => pass.visitDate === formatDateToString(today)).length,
  passesTomorrow: mockGuestPasses.filter(pass => pass.visitDate === formatDateToString(tomorrow)).length,
};
