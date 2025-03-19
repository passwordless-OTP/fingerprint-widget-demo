'use client';

import React from 'react';
import AllowBlockListAdmin from '../components/AllowBlockListAdmin';
import { AdminAuthProvider } from '../contexts/AdminAuthContext';
import AdminLogin from '../components/AdminLogin';
import AdminProtectedRoute from '../components/AdminProtectedRoute';
import AdminHeader from '../components/AdminHeader';

export default function AdminPage() {
  return (
    <AdminAuthProvider>
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <AdminHeader />
          <AdminProtectedRoute>
            <AllowBlockListAdmin />
          </AdminProtectedRoute>
        </div>
      </main>
    </AdminAuthProvider>
  );
} 