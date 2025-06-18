"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from '@/contexts/AuthContext';
import { validateRegister } from '@/utils/validate';
import { registerUser } from '@/lib/auth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dob: '',
    nickname: '',
    aboutMe: '',
    avatar: null as File | null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setRegisterError(null); // Reset error on input change
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, avatar: file });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateRegister(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    setRegisterError(null);
    const submitData = new FormData();
    submitData.append('email', formData.email);
    submitData.append('password', formData.password);
    submitData.append('firstName', formData.firstName);
    submitData.append('lastName', formData.lastName);
    submitData.append('dob', formData.dob);
    if (formData.nickname) submitData.append('nickname', formData.nickname);
    if (formData.aboutMe) submitData.append('aboutMe', formData.aboutMe);
    if (formData.avatar) submitData.append('avatar', formData.avatar);

    try {
      await registerUser(submitData);
      router.push('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setRegisterError(err.message || 'Registration failed. There was a server error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Register</CardTitle>
        </CardHeader>
        <CardContent>
          {registerError && (
            <Alert className="mb-4">
              <AlertDescription>{registerError}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
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
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                className={errors.dob ? "border-red-500" : ""}
              />
              {errors.dob && (
                <p className="text-sm text-red-500">{errors.dob}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (Optional)</Label>
              <Input
                id="nickname"
                name="nickname"
                type="text"
                value={formData.nickname}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aboutMe">About Me (Optional)</Label>
              <Textarea
                id="aboutMe"
                name="aboutMe"
                value={formData.aboutMe}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar (Optional, JPEG/PNG/GIF)</Label>
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept=".jpg,.jpeg,.png,.gif"
                onChange={handleFileChange}
                className={errors.avatar ? "border-red-500" : ""}
              />
              {errors.avatar && (
                <p className="text-sm text-red-500">{errors.avatar}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Already have an account? Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 