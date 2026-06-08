"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import { queryClient } from "./configs/query-client";
import { DragDropProvider } from "@dnd-kit/react";
import { Toaster } from "@/components/ui/sonner";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <DragDropProvider>
        {children}
      </DragDropProvider>
      {/* Devtools sẽ mặc định ẩn ở môi trường production */}
      <ReactQueryDevtools initialIsOpen={false} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
