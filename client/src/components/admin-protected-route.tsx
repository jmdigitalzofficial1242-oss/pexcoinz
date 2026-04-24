import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminToken } from "@/lib/auth-utils";

function isAdminTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "admin") return false;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    const ok = isAdminTokenValid(token);
    setValid(ok);
    setChecking(false);
    if (!ok) navigate("/admin", { replace: true });
  }, [navigate]);

  if (checking) {
    return (
      <div className="p-8 space-y-4 bg-[#0a0a0a] min-h-screen">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!valid) return null;

  return <>{children}</>;
}
