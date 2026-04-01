import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminPanel from './pages/AdminPanel';
import ExpenseDetail from './pages/ExpenseDetail';
import Layout from './components/Layout';
import ThemeToggle from './components/ThemeToggle';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const RoleRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
  return <Navigate to="/employee" replace />;
};

const App = () => {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route path="/" element={<RoleRouter />} />

        <Route element={<Layout />}>
          <Route
            path="/employee"
            element={
              <PrivateRoute roles={['EMPLOYEE', 'ADMIN', 'MANAGER']}>
                <EmployeeDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <PrivateRoute roles={['MANAGER', 'ADMIN']}>
                <ManagerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['ADMIN']}>
                <AdminPanel />
              </PrivateRoute>
            }
          />
          <Route
            path="/expenses/:id"
            element={
              <PrivateRoute>
                <ExpenseDetail />
              </PrivateRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
