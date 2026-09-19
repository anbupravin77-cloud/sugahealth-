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
import PharmacistQueue from './pages/pharmacist/PharmacistQueue';
import PharmacistOrderView from './pages/pharmacist/PharmacistOrderView';
import CheckoutSuccess from './pages/patient/CheckoutSuccess';
import Messages from './pages/patient/Messages';
import { ContentProvider } from './context/ContentContext';
import { AuthProvider } from './context/AuthContext';
import { DoctorAuthProvider } from './context/DoctorAuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DoctorProtectedRoute } from './components/doctor/DoctorProtectedRoute';
import DoctorPortalShell from './components/doctor/DoctorPortalShell';
import DoctorLogin from './pages/doctor/DoctorLogin';
import DoctorHome from './pages/doctor/DoctorHome';
import DoctorWorkQueue from './pages/doctor/DoctorWorkQueue';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorPatientChart from './pages/doctor/DoctorPatientChart';
import DoctorConsultationWorkspace from './pages/doctor/DoctorConsultationWorkspace';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions';
import DoctorMessages from './pages/doctor/DoctorMessages';
import DoctorFollowUps from './pages/doctor/DoctorFollowUps';
import DoctorProfile from './pages/doctor/DoctorProfile';
import DoctorSettings from './pages/doctor/DoctorSettings';
import AuthTest from './pages/AuthTest';
import { isAuthTestEnabled } from './lib/authConfig';

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
        <DoctorAuthProvider>
          <ContentProvider>
            <ScrollToTop />
            <Routes>
              {/* Public Website Routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="weight-loss" element={<WeightLoss />} />
                <Route path="hair-growth" element={<HairGrowth />} />
                <Route path="sexual-health" element={<SexualHealth />} />
                <Route path="about" element={<About />} />
              </Route>

              {/* Patient Auth & Auth-Test */}
              <Route path="/login" element={<Login />} />
              {isAuthTestEnabled() && <Route path="/auth-test" element={<AuthTest />} />}

              {/* Doctor Portal Routes (Frontend UI & Demo Session) */}
              <Route path="/doctor/login" element={<DoctorLogin />} />
              <Route element={<DoctorProtectedRoute />}>
                <Route path="/doctor" element={<DoctorPortalShell />}>
                  <Route index element={<DoctorHome />} />
                  <Route path="work-queue" element={<DoctorWorkQueue />} />
                  <Route path="queue" element={<DoctorWorkQueue />} />
                  <Route path="patients" element={<DoctorPatients />} />
                  <Route path="patients/:id" element={<DoctorPatientChart />} />
                  <Route path="consultations/:id" element={<DoctorConsultationWorkspace />} />
                  <Route path="review/:id" element={<DoctorConsultationWorkspace />} />
                  <Route path="prescriptions" element={<DoctorPrescriptions />} />
                  <Route path="messages" element={<DoctorMessages />} />
                  <Route path="follow-ups" element={<DoctorFollowUps />} />
                  <Route path="refills" element={<DoctorFollowUps />} />
                  <Route path="profile" element={<DoctorProfile />} />
                  <Route path="settings" element={<DoctorSettings />} />
                </Route>
              </Route>
              
              {/* Staff Onboarding */}
              <Route element={<ProtectedRoute requireOnboarding={false} />}>
                <Route path="/onboarding" element={<StaffOnboarding />} />
              </Route>
              
              {/* Protected Patient Account Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/account" element={<Account />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/consultation" element={<Consultation />} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
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
        </DoctorAuthProvider>
      </AuthProvider>
    </Router>
  );
}
