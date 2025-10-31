"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hide header on auth pages
  if (pathname === '/auth') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 bg-white/70 dark:bg-slate-900/70 border-b border-white/60 dark:border-slate-800 transition-colors duration-300">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-xl text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-2"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="inline">LifeLine</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>Home</Link>
          <Link href="/map" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/map' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>Live Map</Link>
          <Link href="/alerts" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/alerts' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>Alerts</Link>
          <Link href="/resources" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/resources' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>Resources</Link>
          <Link href="/guides" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/guides' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>Guides</Link>
          <Link href="/status" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/status' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>My Status</Link>
          <Link href="/history" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/history' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>History</Link>
          <Link href="/groups" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/groups' || pathname?.startsWith('/groups/') ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>Socialize</Link>
          <Link href="/profile" className={`text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${pathname === '/profile' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>Profile</Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:scale-[1.05] transition-all flex items-center justify-center text-lg"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          aria-label="Toggle mobile menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <Link href="/map" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Live Map</Link>
            <Link href="/alerts" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Alerts</Link>
            <Link href="/resources" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Resources</Link>
            <Link href="/guides" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Guides</Link>
            <Link href="/status" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>My Status</Link>
            <Link href="/history" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>History</Link>
            <Link href="/groups" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Socialize</Link>
            <Link href="/profile" className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Profile</Link>
            <button
              type="button"
              onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">{theme === "dark" ? "☀️" : "🌙"}</span>
              <span>Toggle Theme</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}


