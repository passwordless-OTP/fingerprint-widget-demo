import React from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { LogOut } from 'lucide-react';

const AdminHeader: React.FC = () => {
  const { isAuthenticated, logout } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-center">Admin Dashboard</h1>
      
      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          aria-label="Logout"
        >
          <LogOut size={18} className="mr-2" />
          Logout
        </button>
      )}
    </div>
  );
};

export default AdminHeader; 