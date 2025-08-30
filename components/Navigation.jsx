'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const AnimatedNavLink = ({ href, children }) => {
  const textSizeClass = 'text-sm';

  return (
    <a href={href} className={`group relative inline-block h-12 flex items-center justify-center ${textSizeClass} text-gray-700 hover:text-gray-900 transition-colors duration-300 ease-out`}>
      <span className="leading-6 block flex items-center">{children}</span>
    </a>
  );
};

export default function Navigation() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const shapeTimeoutRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/resident/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/resident/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const logoElement = (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-600 top-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-600 left-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-600 right-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-600 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
    </div>
  );

  const navLinksData = [
    { label: 'Resident Portal', href: '/resident' },
    { label: 'Guest Verification', href: '/guest' },
    { label: 'Admin Portal', href: '/admin' },
  ];

  const authButtonElement = () => {
    if (!authChecked) {
      return null; // Don't show button until we've checked auth
    }

    if (user) {
      // Show Sign Out button
      return (
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-0 -m-2 rounded-full
                         hidden sm:block
                         bg-gray-100
                         opacity-40 filter blur-lg pointer-events-none
                         transition-all duration-300 ease-out
                         group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3"></div>
          <button 
            onClick={handleLogout}
            className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200 w-full sm:w-auto"
          >
            Sign Out
          </button>
        </div>
      );
    } else {
      // Show Sign In button
      return (
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-0 -m-2 rounded-full
                         hidden sm:block
                         bg-gray-100
                         opacity-40 filter blur-lg pointer-events-none
                         transition-all duration-300 ease-out
                         group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3"></div>
          <button 
            onClick={() => router.push('/resident/login')}
            className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200 w-full sm:w-auto"
          >
            Sign In
          </button>
        </div>
      );
    }
  };

  return (
    <header className={`relative w-full
                       flex flex-col items-center
                       px-8 py-4 backdrop-blur-sm
                       ${headerShapeClass}
                       border-b border-gray-200 bg-white shadow-sm
                       transition-[border-radius] duration-0 ease-in-out`}>

      <div className="flex items-center gap-x-8">
        <div className="flex items-center">
          {logoElement}
        </div>

        <nav className="hidden sm:flex items-center space-x-8 text-sm whitespace-nowrap">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-4">
          {authButtonElement()}
        </div>

        <button className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-700 focus:outline-none" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </button>
      </div>

      <div className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <a key={link.href} href={link.href} className="text-gray-700 hover:text-gray-900 transition-colors w-full text-center">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          {authButtonElement()}
        </div>
      </div>
    </header>
  );
}
