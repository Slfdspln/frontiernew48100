# Frontier Tower Guest Pass System

A modern web application for managing guest passes in a residential building. This system allows residents to create guest passes (limited to 3 per month), guests to verify their passes, and administrators to manage the entire system.

## Features

### Resident Portal
- View remaining guest passes for the current month (3 per month limit)
- Create new guest passes with guest details and visit dates
- Generate QR codes for guest passes
- View and manage existing guest passes
- Cancel guest passes if needed

### Guest Portal
- Enter or scan guest pass codes
- Verify pass validity
- View pass details upon successful verification

### Admin Portal
- Manage residents and their information
- View and search all guest passes in the system
- Approve or reject pending guest passes
- Reset guest pass counts for residents
- View system statistics and usage metrics

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Animations**: Framer Motion
- **Canvas Effects**: Three.js, @react-three/fiber
- **QR Code**: react-qr-code

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/frontier-tower-guest-pass.git
cd frontier-tower-guest-pass
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── admin/              # Admin portal page
│   ├── guest/              # Guest portal page
│   ├── resident/           # Resident portal page
│   ├── globals.css         # Global styles
│   ├── layout.jsx          # Root layout
│   └── page.jsx            # Home page
├── components/             # React components
│   ├── AdminPortal.jsx     # Admin portal component
│   ├── GuestPortal.jsx     # Guest portal component
│   ├── MiniNavbar.jsx      # Navigation component
│   └── ResidentPortal.jsx  # Resident portal component
├── utils/                  # Utility functions
│   ├── authUtils.js        # Authentication utilities
│   ├── guestPassUtils.js   # Guest pass utilities
│   ├── mockData.js         # Mock data for development
│   └── qrCodeUtils.js      # QR code utilities
├── CanvasRevealEffect.jsx  # Canvas animation component
├── package.json            # Project dependencies
├── tailwind.config.js      # Tailwind CSS configuration
└── postcss.config.js       # PostCSS configuration
```

## Mock Data

For development purposes, the application uses mock data for residents, guest passes, and authentication. In a production environment, these would be replaced with actual backend API calls.

### Mock Credentials

#### Admin Login
- Email: admin@frontiertower.com
- Password: admin123

#### Resident Login
- Email: john.smith@example.com
- Password: 101 (unit number)

## Future Enhancements

- Backend integration with a database
- Real authentication system
- Email notifications for pass approvals/rejections
- Mobile app with QR code scanner
- Integration with building access control systems

## License

This project is licensed under the MIT License - see the LICENSE file for details.
