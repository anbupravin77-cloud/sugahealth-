import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldCheck, Lock, User as UserIcon, LogOut, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useContent } from '../context/ContentContext';
import { DraftPreviewBanner } from './DraftPreviewBanner';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const { content } = useContent();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  const global = content?.global;
  const seo = content?.seo;

  const navLinks = global?.navLinks || [
    { name: 'Weight Loss', path: '/weight-loss', desc: 'GLP-1 medical protocols' },
    { name: 'Hair Growth', path: '/hair-growth', desc: 'Follicular regeneration' },
    { name: 'Sexual Health', path: '/sexual-health', desc: 'Performance & longevity' },
    { name: 'About', path: '/about', desc: 'Clinical team & safety' },
  ];
  const headerCta = global?.headerCta || { label: 'Start consultation', path: '/consultation' };
  const tagline = global?.tagline || 'live naturally';
  const footer = global?.footer;

  // Dynamically synchronize document title and meta description
  useEffect(() => {
    if (seo?.title) {
      document.title = seo.title;
    }
    if (seo?.description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', seo.description);
    }
  }, [seo]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Auto-close menu if resized to desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-neutral-900 selection:text-white w-full max-w-full overflow-x-hidden">
      <DraftPreviewBanner />

      {/* Top Fixed Header */}
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
          scrolled 
            ? "bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs py-3 sm:py-3.5" 
            : "bg-white backdrop-blur-md border-b border-neutral-200/80 py-3.5 sm:py-4"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Logo & Tagline */}
          <Link to="/" className="flex flex-col items-start group select-none shrink-0" onClick={closeMenu}>
            <span className="font-sans text-xl sm:text-2xl tracking-tighter uppercase font-black text-neutral-950 group-hover:text-neutral-700 transition-colors leading-none">
              SUGA<span className="text-neutral-400">.</span>HEALTH
            </span>
            <span className="brand-tagline text-neutral-500 mt-0.5">
              {tagline}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 bg-neutral-100/80 p-1.5 rounded-full border border-neutral-200/80">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path || "/"}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 whitespace-nowrap",
                  pathname === (link.path || "/") 
                    ? "bg-neutral-950 text-white" 
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200">
                  <UserIcon size={14} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-700 max-w-[100px] truncate">
                    {profile?.displayName || user.email || user.phoneNumber || 'User'}
                  </span>
                  <span className="ml-1 rounded bg-neutral-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-neutral-600">
                    {profile?.role || 'patient'}
                  </span>
                </div>
                <Link
                  to="/account"
                  className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                  title="My Account"
                >
                  <UserIcon size={18} />
                </Link>
                <Link
                  to="/messages"
                  className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                  title="Messages"
                >
                  <MessageSquare size={18} />
                </Link>
                <NotificationCenter />
                {profile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                    title="Admin Dashboard"
                  >
                    <Lock size={18} />
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center text-xs font-bold uppercase tracking-wider text-neutral-700 hover:text-neutral-950 transition-colors mr-2"
              >
                Sign In
              </Link>
            )}

            <Link
              to={headerCta?.path || "/consultation"}
              className="hidden sm:inline-flex items-center justify-center bg-neutral-950 border border-neutral-950 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold tracking-wider uppercase text-white hover:bg-neutral-800 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs group whitespace-nowrap"
            >
              {headerCta.label}
              <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              className="lg:hidden p-2 rounded-xl text-neutral-900 hover:bg-neutral-100 focus:outline-none transition-colors"
              onClick={toggleMenu}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col lg:hidden"
          >
            {/* Mobile Drawer Top Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-200/80 bg-white shrink-0">
              <Link to="/" onClick={closeMenu} className="flex flex-col items-start select-none">
                <span className="font-sans text-xl sm:text-2xl tracking-tighter uppercase font-black text-neutral-950 leading-none">
                  SUGA<span className="text-neutral-400">.</span>HEALTH
                </span>
                <span className="brand-tagline text-neutral-500 mt-0.5">
                  {tagline}
                </span>
              </Link>
              <button
                onClick={closeMenu}
                className="p-2 rounded-xl text-neutral-900 hover:bg-neutral-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            {/* Mobile Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase block mb-4">
                  Clinical Protocols
                </span>
                <div className="space-y-2.5">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 + 0.05, duration: 0.2 }}
                    >
                      <Link
                        to={link.path || "/"}
                        onClick={closeMenu}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl transition-all",
                          pathname === (link.path || "/") 
                            ? "bg-neutral-950 text-white shadow-sm" 
                            : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900"
                        )}
                      >
                        <div>
                          <span className={cn(
                            "block font-sans text-lg font-bold tracking-tight",
                            pathname === (link.path || "/") ? "text-white" : "text-neutral-950"
                          )}>
                            {link.name}
                          </span>
                          <span className={cn(
                            "block text-xs mt-0.5",
                            pathname === (link.path || "/") ? "text-neutral-300" : "text-neutral-500"
                          )}>
                            {link.desc}
                          </span>
                        </div>
                        <ArrowRight 
                          size={18} 
                          className={pathname === (link.path || "/") ? "text-white" : "text-neutral-400"} 
                        />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-8 border-t border-neutral-100 mt-6">
                {user ? (
                  <div className="mb-6 flex flex-col space-y-4 rounded-2xl bg-neutral-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                          <UserIcon size={20} className="text-neutral-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-neutral-900">
                            {profile?.displayName || user.email || user.phoneNumber || 'User'}
                          </div>
                          <div className="text-xs text-neutral-500 uppercase tracking-widest mt-0.5">
                            {profile?.role || 'patient'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          signOut();
                          closeMenu();
                        }}
                        className="p-2 text-neutral-500 hover:text-neutral-900"
                      >
                        <LogOut size={20} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to="/account"
                        onClick={closeMenu}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <UserIcon size={14} />
                        My Account
                      </Link>
                      {profile?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={closeMenu}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <Lock size={14} />
                          Admin
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="mb-4 flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white py-3.5 px-6 text-sm font-bold tracking-wide text-neutral-900 shadow-sm"
                  >
                    Sign In
                  </Link>
                )}

                <Link
                  to={headerCta?.path || "/consultation"}
                  onClick={closeMenu}
                  className="flex w-full items-center justify-center bg-neutral-950 py-4 px-6 rounded-full text-xs font-bold tracking-wider uppercase text-white shadow-md hover:bg-neutral-800 transition-colors"
                >
                  <span>{headerCta.label}</span>
                  <ArrowRight size={16} className="ml-2" />
                </Link>
                <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-neutral-900" />
                    <span>Licensed US Clinicians • 100% Confidential</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={cn("flex-grow w-full max-w-full", pathname === "/" ? "pt-[61px] sm:pt-[70px]" : "pt-20 sm:pt-24")}>
        <Outlet />
      </main>

      <footer className="bg-neutral-950 text-neutral-300 py-12 md:py-16 border-t border-neutral-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-10 sm:mb-12">
            <div className="md:col-span-6 lg:col-span-6">
              <Link to="/" className="flex flex-col items-start group select-none mb-6">
                <span className="font-sans text-2xl tracking-tighter uppercase font-black text-white">
                  SUGA<span className="text-neutral-500">.</span>HEALTH
                </span>
                <span className="brand-tagline text-neutral-400 mt-0.5">
                  {tagline}
                </span>
              </Link>
              <p className="text-neutral-400 max-w-md text-sm leading-relaxed">
                {footer?.description || 'Confidential, doctor-guided treatments for medical weight loss, hair restoration, and sexual vitality. Real FDA-approved medicines delivered with care and complete privacy.'}
              </p>
            </div>
            
            <div className="md:col-span-3 lg:col-span-3">
              <h4 className="font-semibold text-white mb-5 uppercase tracking-widest text-xs">Clinical Treatments</h4>
              <ul className="space-y-3">
                {(footer?.treatmentLinks || [
                  { label: 'Medical Weight Loss (GLP-1)', path: '/weight-loss' },
                  { label: 'Hair Regrowth & Density', path: '/hair-growth' },
                  { label: 'Sexual Health & Performance', path: '/sexual-health' },
                  { label: 'Start Online Consultation', path: '/consultation' },
                ]).map((tl, i) => (
                  <li key={i}>
                    <Link to={tl.path || "/"} className="text-neutral-400 hover:text-white transition-colors text-sm">
                      {tl.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="md:col-span-3 lg:col-span-3">
              <h4 className="font-semibold text-white mb-5 uppercase tracking-widest text-xs">Medical Practice</h4>
              <ul className="space-y-3">
                {(footer?.practiceLinks || [
                  { label: 'Our Doctors & Medical Board', path: '/#doctors' },
                  { label: 'Our Products & Formulary', path: '/#products' },
                  { label: 'About Our Clinical Mission', path: '/about' },
                  { label: 'Patient Medical Intake', path: '/consultation' },
                ]).map((pl, i) => (
                  <li key={i}>
                    {(pl.path || "").startsWith('/#') ? (
                      <a href={pl.path || "/"} className="text-neutral-400 hover:text-white transition-colors text-sm">
                        {pl.label}
                      </a>
                    ) : (
                      <Link to={pl.path || "/"} className="text-neutral-400 hover:text-white transition-colors text-sm">
                        {pl.label}
                      </Link>
                    )}
                  </li>
                ))}
                <li>
                  <Link to="/admin" className="text-neutral-500 hover:text-neutral-300 transition-colors text-xs inline-flex items-center gap-1.5 pt-2">
                    <Lock size={12} /> Staff / Client CMS
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between gap-6 text-xs text-neutral-500 leading-relaxed">
            <div className="max-w-3xl space-y-2">
              <p>
                {footer?.telehealthDisclaimer || 'Suga.health facilitates telehealth consultations through licensed medical professionals. Prescription products require an online evaluation with a licensed healthcare provider who will determine if a prescription is appropriate.'}
              </p>
              <p>
                {footer?.pharmacyDisclaimer || 'Medications are dispensed by licensed US pharmacies. Not for emergency medical conditions. If you are experiencing a medical emergency, call 911 immediately.'}
              </p>
            </div>
            <p className="shrink-0 font-medium text-neutral-400 self-start md:self-end">
              &copy; {new Date().getFullYear()} {footer?.copyright || 'Suga.health. All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
