// routes/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../hooks/useAppSelector";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token } = useAppSelector((state) => state.auth);

  if (!token && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;