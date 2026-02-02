// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SubmitReceipt from "./pages/SubmitReceipt";
import Login from "./pages/Login";
import TripsPage from "./pages/TripsPage";
import TripBillsPage from "./pages/TripBillsPage";
import BillEditPage from "./pages/BillEditPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload/:tripId" element={<SubmitReceipt />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:tripId" element={<TripBillsPage />} />
        <Route path="/bills/:billId/edit" element={<BillEditPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
