"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "../../frontend/src/contexts/AuthContext";


// Update the import path below to the correct location of your App component
const App = dynamic(() => import("../../frontend/src/App.jsx"), { ssr: false });

export function ClientOnly() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
