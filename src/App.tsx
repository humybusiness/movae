import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./landing/LandingPage";
import MovaeApp from "./app/MovaeApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<MovaeApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
