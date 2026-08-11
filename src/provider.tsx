"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import { queryClient } from "./configs/query-client";
import { Toaster } from "@/components/ui/sonner";

export interface ProvidersProps {
  children: React.ReactNode;
}

// KHÔNG có `DragDropProvider` của `@dnd-kit/react` ở đây nữa. Nó bọc cả cây nhưng không
// ai dùng: bảng deal (`KanbanBoard`) và bảng task (`TaskKanban`) đều chạy bằng
// `@dnd-kit/core` + `@dnd-kit/sortable` — thế hệ khác, context khác, không đọc được
// context của `@dnd-kit/react`. Đổi lại nó kéo 5 gói `@dnd-kit` vào gói khởi động mà
// khách vào trang giới thiệu cũng phải tải.
//
// Bộ test KHÔNG bắt được lỗi này: `KanbanBoard.test.tsx` và `TaskKanban.test.tsx` đều
// render component trần, không dựng `Providers`. Phải kéo thử tay.  #Huynh
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools sẽ mặc định ẩn ở môi trường production */}
      <ReactQueryDevtools initialIsOpen={false} />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
