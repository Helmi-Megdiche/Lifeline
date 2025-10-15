"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ConditionalHeader = () => {
  const pathname = usePathname();
  
  // Hide header on auth pages for better UX
  if (pathname === '/auth') {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            LifeLine
          </Link>
          <div className="flex gap-6 text-sm font-medium">
            <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">Home</Link>
            <Link href="/resources" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">Resources</Link>
            <Link href="/guides" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">Guides</Link>
            <Link href="/status" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">My Status</Link>
            <Link href="/history" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">History</Link>
            <Link href="/auth" className="text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">Profile</Link>
          </div>
        </div>
      </nav>
    </header>
  );
};
