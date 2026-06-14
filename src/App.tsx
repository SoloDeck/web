import { useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { useConfigStore } from "@/features/auth/hooks/useConfigStore";

const router = getRouter();

function App() {
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const isLoading = useConfigStore((s) => s.isLoading);
  const error = useConfigStore((s) => s.error);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Đang tải cấu hình hệ thống...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-destructive">Lỗi tải cấu hình</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => fetchConfig()}
            className="mt-4 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;

