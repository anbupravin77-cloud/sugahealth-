/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import WeightLoss from './pages/WeightLoss';
import HairGrowth from './pages/HairGrowth';
import SexualHealth from './pages/SexualHealth';
import About from './pages/About';
import Consultation from './pages/Consultation';
import Admin from './pages/admin/Admin';
import Login from './pages/Login';
import Account from './pages/Account';
import StaffOnboarding from './pages/StaffOnboarding';
import DoctorQueue from './pages/doctor/Queue';
import DoctorReview from './pages/doctor/Review';
import PharmacistQueue from './pages/pharmacist/PharmacistQueue';
import PharmacistOrderView from './pages/pharmacist/PharmacistOrderView';
import CheckoutSuccess from './pages/patient/CheckoutSuccess';
import Messages from './pages/patient/Messages';
import DoctorMessages from './pages/doctor/DoctorMessages';
import { ContentProvider } from './context/ContentContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ContentProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="weight-loss" element={<WeightLoss />} />
              <Route path="hair-growth" element={<HairGrowth />} />
              <Route path="sexual-health" element={<SexualHealth />} />
              <Route path="about" element={<About />} />
            </Route>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            
            {/* Staff Onboarding */}
            <Route element={<ProtectedRoute requireOnboarding={false} />}>
              <Route path="/onboarding" element={<StaffOnboarding />} />
            </Route>
            
            {/* Protected Account Route */}
            <Route element={<ProtectedRoute />}>
              <Route path="/account" element={<Account />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/consultation" element={<Consultation />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
            </Route>

            {/* Doctor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['doctor', 'admin']} />}>
              <Route path="/doctor" element={<DoctorQueue />} />
              <Route path="/doctor/messages" element={<DoctorMessages />} />
              <Route path="/doctor/review/:id" element={<DoctorReview />} />
            </Route>

            {/* Pharmacist Routes */}
            <Route element={<ProtectedRoute allowedRoles={['pharmacist', 'admin']} />}>
              <Route path="/pharmacist" element={<PharmacistQueue />} />
              <Route path="/pharmacist/order/:id" element={<PharmacistOrderView />} />
            </Route>
            
            {/* Protected Administrative CMS */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<Admin />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </ContentProvider>
      </AuthProvider>
    </Router>
  );
}
