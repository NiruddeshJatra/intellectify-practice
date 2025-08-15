import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import RoleBasedRoute from './RoleBasedRoute';

/**
 * Example Route Configuration with Protected Routes
 * 
 * This file demonstrates how to use the protected route components
 * with different authentication and authorization requirements.
 */

// Example page components (these would be your actual pages)
const HomePage = () => <div>Home Page</div>;
const DashboardPage = () => <div>Dashboard Page</div>;
const AdminPage = () => <div>Admin Page</div>;
const MentorPage = () => <div>Mentor Page</div>;
const ProfilePage = () => <div>Profile Page</div>;

const RouteExamples = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<HomePage />} />
      
      {/* Protected routes - require authentication */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      
      {/* Admin-only routes */}
      <Route element={<RoleBasedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>
      
      {/* Mentor and Admin routes */}
      <Route element={<RoleBasedRoute allowedRoles={['ADMIN', 'MENTOR']} />}>
        <Route path="/mentor" element={<MentorPage />} />
      </Route>
    </Routes>
  );
};

export default RouteExamples;