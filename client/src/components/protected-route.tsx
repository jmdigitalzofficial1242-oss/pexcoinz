import { useGetMe } from "@workspace/api-client-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useGetMe({ query: { retry: false } });
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, error, user, navigate]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !user) return null;

  return <>{children}</>;
}
