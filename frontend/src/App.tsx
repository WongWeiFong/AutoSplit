// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SubmitReceipt from "./pages/SubmitReceipt";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload" element={<SubmitReceipt />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
