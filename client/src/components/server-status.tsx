import { useHealthCheck } from "@workspace/api-client-react";
import { AlertCircle } from "lucide-react";

export function ServerStatus() {
  const { data, isError } = useHealthCheck({ query: { retry: false, refetchInterval: 30000 } });

  if (isError || (data && data.status !== "ok")) {
    return (
      <div className="bg-destructive text-destructive-foreground text-xs p-1 text-center font-medium flex items-center justify-center gap-2">
        <AlertCircle className="h-3 w-3" />
        Connection to server lost. Some features may not be available.
      </div>
    );
  }

  return null;
}
