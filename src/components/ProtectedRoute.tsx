import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type AppRole = "admin" | "rep" | "manager";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading, roleLoading } = useAuth();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    // Admin always has access, otherwise check if role is in allowed list
    if (role !== "admin" && (!role || !allowedRoles.includes(role as AppRole))) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
