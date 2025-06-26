"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateLogin } from '@/utils/validate';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLoginError(null); // Reset error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    const validationErrors = validateLogin(formData);
    
    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      setLoginError(null);
      try {
        await login(formData);
        // Use window.location.href for immediate redirect to avoid Next.js router delays
        window.location.href = '/';
      } catch (err) {
        console.error('Login failed:', err);
        setLoginError((err as Error).message || 'Login failed. Please check your credentials and try again.');
        setIsSubmitting(false);
      }
    } else {
      setErrors(validationErrors);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          {loginError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Logging in...
                </div>
              ) : (
                'Login'
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/register')}
            >
              Don't have an account? Register
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 