import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// Découpage par route : la landing reste légère, Firebase et l'app ne se
// chargent que lorsqu'on ouvre /app.
const LandingPage = lazy(() => import("./landing/LandingPage"));
const MovaeApp = lazy(() => import("./app/MovaeApp"));

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fond">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-sauge/30 border-t-sauge-fonce" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/*" element={<MovaeApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
