"use client"

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from './Navbar';

interface AppContentProps {
  children: React.ReactNode;
}

export const AppContent: React.FC<AppContentProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const isAuthenticated = !!currentUser;
  const isAuthPage = ['/login', '/register'].includes(pathname);
  const showNavbar = isAuthenticated && !isAuthPage;

  // Handle route protection in effect rather than routing (since Next.js handles routing)
  React.useEffect(() => {
    console.log('AppContent useEffect - isAuthenticated:', isAuthenticated, 'loading:', loading, 'pathname:', pathname);
    
    // Don't redirect during loading
    if (loading) return;

    // Redirect unauthenticated users from protected routes
    if (!isAuthenticated && !isAuthPage) {
      console.log('Redirecting unauthenticated user to login');
      router.push('/login');
      return;
    }

    // Redirect authenticated users from auth pages
    if (isAuthenticated && isAuthPage) {
      console.log('Redirecting authenticated user to home');
      router.push('/');
      return;
    }
  }, [isAuthenticated, pathname, loading, router, isAuthPage]);

  // Show a loading screen while session is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login redirect for unauthenticated users on protected routes
  if (!isAuthenticated && !isAuthPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}; 