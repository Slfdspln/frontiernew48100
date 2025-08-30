'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MiniNavbar() {
  const pathname = usePathname();
  const link = (href, label) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-lg border transition
          ${active ? 'border-white/40 bg-white/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex gap-2 items-center">
      {link('/', 'Home')}
      {link('/resident', 'Resident')}
      {link('/guest', 'Guest')}
      {link('/admin', 'Admin')}
      {link('/login', 'Login')}
    </nav>
  );
}

export { MiniNavbar };
