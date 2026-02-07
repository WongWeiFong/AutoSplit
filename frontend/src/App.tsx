// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import SubmitReceipt from "./pages/SubmitReceipt";
import Login from "./pages/Login";
import TripsPage from "./pages/TripsPage";
import TripBillsPage from "./pages/TripBillsPage";
import BillEditPage from "./pages/BillEditPage";
import AuthCallback from "./auth/AuthCallBack";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload/:tripId" element={<RequireAuth><SubmitReceipt /></RequireAuth>} />
        <Route path="/trips" element={ <RequireAuth> <TripsPage /> </RequireAuth> } />
        <Route path="/trips/:tripId" element={<RequireAuth><TripBillsPage /></RequireAuth>} />
        <Route path="/bills/:billId/edit" element={<RequireAuth><BillEditPage /></RequireAuth>} />
        <Route path="/auth/callback" element={<AuthCallback />} />

      </Routes>
    </BrowserRouter>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}


export default App;
