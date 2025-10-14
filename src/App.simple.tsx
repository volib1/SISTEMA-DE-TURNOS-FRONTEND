import React from 'react';
import { AuthProvider } from './components/Auth/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import TestComponent from './components/Test/TestComponent';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default App;