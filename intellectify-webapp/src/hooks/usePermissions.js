import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for checking user permissions
 * 
 * Provides utility functions to check user roles and permissions
 * in components without needing to access AuthContext directly.
 */
export const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();

  /**
   * Check if user has a specific role
   * @param {string} role - Role to check for
   * @returns {boolean} - True if user has the role
   */
  const hasRole = (role) => {
    return isAuthenticated && user && user.role === role;
  };

  /**
   * Check if user has any of the specified roles
   * @param {string[]} roles - Array of roles to check
   * @returns {boolean} - True if user has any of the roles
   */
  const hasAnyRole = (roles) => {
    return isAuthenticated && user && roles.includes(user.role);
  };

  /**
   * Check if user is an admin
   * @returns {boolean} - True if user is admin
   */
  const isAdmin = () => {
    return hasRole('ADMIN');
  };

  /**
   * Check if user is a mentor
   * @returns {boolean} - True if user is mentor
   */
  const isMentor = () => {
    return hasRole('MENTOR');
  };

  /**
   * Check if user is a regular user
   * @returns {boolean} - True if user is regular
   */
  const isRegular = () => {
    return hasRole('REGULAR');
  };

  /**
   * Check if user can access admin features
   * @returns {boolean} - True if user can access admin features
   */
  const canAccessAdmin = () => {
    return isAdmin();
  };

  /**
   * Check if user can access mentor features
   * @returns {boolean} - True if user can access mentor features
   */
  const canAccessMentor = () => {
    return isAdmin() || isMentor();
  };

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    isMentor,
    isRegular,
    canAccessAdmin,
    canAccessMentor,
    user,
    isAuthenticated,
  };
};