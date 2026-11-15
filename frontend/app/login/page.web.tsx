// Sign-in page of the online system (web build only; the desktop export has no login).
import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign in · ASTRA Health', robots: { index: false } };

export default function LoginPage() {
  return <LoginForm />;
}
