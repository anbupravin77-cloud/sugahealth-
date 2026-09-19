import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { supabase } from '../../lib/supabase';
import {
  MOCK_CONSULTATIONS,
  MOCK_MESSAGE_THREADS,
  MOCK_FOLLOW_UPS,
  MOCK_NOTIFICATIONS,
} from '../../data/doctorMockData';
import { GlobalSearchModal } from './common/GlobalSearchModal';
import {
  Home,
  ClipboardList,
  Users,
  FileSpreadsheet,
  MessageSquare,
  Clock,
  UserCheck,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Stethoscope,
  Activity,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Filter,
} from 'lucide-react';

interface NavItemConfig {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeVariant?: 'urgent' | 'normal';
}

interface NavGroup {
  group: string;
  items: NavItemConfig[];
}

export default function DoctorPortalShell() {
  const { doctor, logout } = useDoctorAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'clinical' | 'messages' | 'administrative'>('all');
  const [notifications, setNotifications] = useState<any[]>(MOCK_NOTIFICATIONS);
  const [shiftStatus, setShiftStatus] = useState<'active' | 'break' | 'offline'>(
    doctor?.shiftStatus || 'active'
  );

  const fetchLiveNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch('/api/clinical/notifications', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.notifications && data.notifications.length > 0) {
            const mapped = data.notifications.map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              timestamp: 'Just now',
              isRead: n.read,
              category: 'clinical',
              link: n.action_url || '/doctor/work-queue',
            }));
            setNotifications(mapped);
          }
        }
      }
    } catch (err) {
      console.warn('Doctor notifications fetch error:', err);
    }
  };

  useEffect(() => {
    fetchLiveNotifications();

    const channel = supabase
      .channel('doctor-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchLiveNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Dynamic badge numbers from mock & live datasets
  const pendingCount = MOCK_CONSULTATIONS.filter((c) => c.status === 'pending_review').length;
  const unreadMessagesCount = MOCK_MESSAGE_THREADS.filter((t) => t.unread).length;
  const pendingFollowUpsCount = MOCK_FOLLOW_UPS.filter((f) => f.dueStatus === 'today' || f.dueStatus === 'overdue').length;
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const NAV_GROUPS: NavGroup[] = [
    {
      group: 'WORK',
      items: [
        { name: 'Home', path: '/doctor', icon: Home },
        {
          name: 'Work Queue',
          path: '/doctor/work-queue',
          icon: ClipboardList,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeVariant: 'urgent',
        },
        { name: 'Patients', path: '/doctor/patients', icon: Users },
      ],
    },
    {
      group: 'CARE',
      items: [
        { name: 'Prescriptions', path: '/doctor/prescriptions', icon: FileSpreadsheet },
        {
          name: 'Messages',
          path: '/doctor/messages',
          icon: MessageSquare,
          badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
          badgeVariant: 'normal',
        },
        {
          name: 'Follow-up',
          path: '/doctor/follow-ups',
          icon: Clock,
          badge: pendingFollowUpsCount > 0 ? pendingFollowUpsCount : undefined,
          badgeVariant: 'normal',
        },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { name: 'Profile', path: '/doctor/profile', icon: UserCheck },
        { name: 'Settings', path: '/doctor/settings', icon: Settings },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/doctor/login');
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notificationFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.category === notificationFilter);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 flex flex-col font-sans antialiased selection:bg-stone-900 selection:text-white">
      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Top Utility Header */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand Identity & Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile menu hamburger button */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            aria-label="Open clinical navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/doctor" className="flex items-center gap-2.5 group">
            <span className="text-base font-semibold tracking-tight text-stone-950 font-sans">
              SUGA<span className="text-emerald-700">.</span>HEALTH
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
              <Stethoscope className="w-3 h-3 text-emerald-700" />
              <span>Doctor Portal</span>
            </span>
          </Link>
        </div>

        {/* Center: Global Patient Quick Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-stone-100/90 hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-stone-200 text-xs transition-colors group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600" />
              <span>Search patients, MRN, or consultations...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white text-stone-500 border border-stone-200 text-3xs font-mono font-medium shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Availability status, Notifications, Profile menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Shift Duty Status Switch */}
          <div className="relative">
            <button
              onClick={() =>
                setShiftStatus((prev) => (prev === 'active' ? 'break' : 'active'))
              }
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                shiftStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200/60'
              }`}
              title="Click to toggle clinical shift status"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  shiftStatus === 'active' ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
                }`}
              />
              <span>{shiftStatus === 'active' ? 'On Duty' : 'On Break'}</span>
            </button>
          </div>

          {/* Search trigger on mobile */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="md:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            aria-label="Search patients"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications Bell & Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileMenuOpen(false);
              }}
              className="relative p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              aria-label="Clinical notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-900">Notifications</span>
                    {unreadNotifCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-3xs font-medium bg-rose-100 text-rose-800">
                        {unreadNotifCount} unread
                      </span>
                    )}
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-2xs text-stone-500 hover:text-stone-800 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-stone-100 bg-white text-2xs">
                  {(['all', 'clinical', 'messages', 'administrative'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setNotificationFilter(tab)}
                      className={`px-2 py-1 rounded-md capitalize font-medium transition-colors ${
                        notificationFilter === tab
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Notification Items */}
                <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400">
                      No notifications in this category
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => (
                      <Link
                        key={notif.id}
                        to={notif.link || '/doctor'}
                        onClick={() => setNotificationsOpen(false)}
                        className={`block p-3.5 hover:bg-stone-50 transition-colors ${
                          !notif.isRead ? 'bg-stone-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-stone-900 leading-snug">
                            {notif.title}
                          </span>
                          <span className="text-3xs text-stone-400 whitespace-nowrap">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-2xs text-stone-500 mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Doctor Profile Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileMenuOpen(!profileMenuOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <img
                src={doctor?.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256'}
                alt={doctor?.name || 'Doctor Avatar'}
                className="w-7 h-7 rounded-full object-cover border border-stone-200"
              />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-stone-900 leading-tight">
                  {doctor?.name || 'Dr. Sarah Mitchell'}
                </span>
                <span className="text-3xs text-stone-500">{doctor?.credentials || 'MD, FACP'}</span>
              </div>
              <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/60">
                  <p className="text-xs font-semibold text-stone-900">{doctor?.name}</p>
                  <p className="text-3xs text-stone-500 font-mono mt-0.5">License: {doctor?.licenseNumber}</p>
                </div>
                <div className="py-1 text-xs">
                  <Link
                    to="/doctor/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                  >
                    <UserCheck className="w-4 h-4 text-stone-400" />
                    <span>Provider Profile</span>
                  </Link>
                  <Link
                    to="/doctor/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                  >
                    <Settings className="w-4 h-4 text-stone-400" />
                    <span>Clinical Settings</span>
                  </Link>
                </div>
                <div className="border-t border-stone-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Shell: Left Navigation + Central Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-stone-200 p-4 shrink-0 justify-between">
          <div className="space-y-6">
            {/* Navigation Groups */}
            {NAV_GROUPS.map((group) => (
              <div key={group.group} className="space-y-1">
                <p className="px-3 text-3xs font-semibold uppercase tracking-wider text-stone-400">
                  {group.group}
                </p>
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/doctor'}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-stone-900 text-white shadow-2xs font-semibold'
                              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className="flex items-center gap-2.5">
                              <Icon
                                className={`w-4 h-4 ${
                                  isActive ? 'text-white' : 'text-stone-400'
                                }`}
                              />
                              <span>{item.name}</span>
                            </span>
                            {item.badge !== undefined && (
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-3xs font-semibold ${
                                  isActive
                                    ? 'bg-stone-800 text-white'
                                    : item.badgeVariant === 'urgent'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Sidebar: Telehealth Info & Logout */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5 text-2xs">
              <div className="flex items-center justify-between text-stone-500">
                <span className="font-medium">Telehealth State Licensure</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <p className="text-stone-800 font-mono font-medium">
                {doctor?.assignedJurisdiction.join(', ')}
              </p>
              <p className="text-3xs text-stone-400">EPCS Compliant Workspace</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-rose-700 hover:bg-rose-50 border border-stone-200/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Slide-Over Navigation Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-2xl z-50 p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                {/* Mobile Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold tracking-tight text-stone-950 font-sans">
                      SUGA<span className="text-emerald-700">.</span>HEALTH
                    </span>
                    <span className="text-2xs px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full font-medium">
                      Doctor Portal
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Navigation Links */}
                {NAV_GROUPS.map((group) => (
                  <div key={group.group} className="space-y-1">
                    <p className="px-3 text-3xs font-semibold uppercase tracking-wider text-stone-400">
                      {group.group}
                    </p>
                    <div className="space-y-1 pt-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/doctor'}
                            onClick={() => setMobileNavOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                isActive
                                  ? 'bg-stone-900 text-white font-semibold'
                                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                              }`
                            }
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </span>
                            {item.badge !== undefined && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Drawer Bottom */}
              <div className="pt-6 border-t border-stone-200 space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <img
                    src={doctor?.avatarUrl}
                    alt={doctor?.name}
                    className="w-10 h-10 rounded-full object-cover border border-stone-200"
                  />
                  <div>
                    <p className="text-xs font-semibold text-stone-900">{doctor?.name}</p>
                    <p className="text-3xs text-stone-500">{doctor?.credentials} • {doctor?.licenseNumber}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Session</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Central Workspace Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
