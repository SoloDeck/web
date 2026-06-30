# SoloDesk Web

> CRM Kanban tích hợp AI cho freelancer Việt Nam.
> Tập trung vào tốc độ xử lý lead, chuyển đổi deal và theo dõi pipeline trực quan.

## ✨ First Impression

SoloDesk không chỉ là bảng Kanban kéo-thả.

- 🚀 Chốt deal nhanh hơn với workflow trực quan theo từng stage.
- 🤖 AI hỗ trợ phân tích lead, gợi ý phản hồi và tạo proposal tiếng Việt.
- 💸 Hiển thị rõ pipeline value, win rate, trạng thái thanh toán theo thời gian thực trên UI.
- 🎯 Thiết kế UX ưu tiên thao tác thật: search, drag-drop, modal review, action buttons theo ngữ cảnh.

## 🔎 Tech Stack Audit (Từ file cấu hình)

### Workspace web

Nguồn kiểm chứng chính: `package.json`, `Dockerfile`, `compose.yml`, `.docker/compose.web.yml`.

| Hạng mục | Kết luận | Bằng chứng |
|---|---|---|
| Ngôn ngữ | TypeScript + JSX (React) | `typescript`, file `.tsx` trong `src/` |
| Framework UI | React 19 + Vite 8 | `react`, `react-dom`, `vite` |
| Router | TanStack Router | `@tanstack/react-router`, `routeTree.gen.ts` |
| State Management | Kết hợp React local state + Zustand | `useState` trong `src/routes/index.tsx`, `zustand` + `useDealStore.ts` |
| Server State / Cache | TanStack Query | `@tanstack/react-query`, `QueryClientProvider` |
| Data Fetching | Axios | `axios`, `src/configs/axios.ts` |
| UI System | TailwindCSS v4 + Shadcn/ui + Lucide | `tailwindcss`, `@tailwindcss/vite`, thư mục `src/components/ui` |
| Drag & Drop | dnd-kit | `@dnd-kit/*`, `DndContext`, `SortableContext` |
| Runtime container | Bun image + Vite preview | `oven/bun`, `bun run build`, `bun run preview` |
| Database | **Chưa có DB client trực tiếp ở frontend** | Không có Prisma/ORM/SQL driver trong deps |

### Workspace dealwise-ai

Nguồn kiểm chứng chính: `package.json`, `wrangler.jsonc`, `src/server.ts`.

| Hạng mục | Kết luận |
|---|---|
| Framework | TanStack Start + React + Vite |
| Runtime | Cloudflare Worker (`wrangler`, `src/server.ts`) |
| State/Data | Có TanStack Query, hiện chưa thấy DB binding trực tiếp |
| Database | **Chưa cấu hình DB trong mã đã quét** |

## 🧱 Cấu trúc mã nguồn và kiến trúc hiện tại

### Cách tổ chức code

Dự án đang đi theo mô hình **Feature-driven + Layered UI**:

- `src/components/ui`: design system (Shadcn primitives).
- `src/components/solodesk`: domain UI theo nghiệp vụ CRM.
- `src/features/deals`: feature module độc lập (board/store/components).
- `src/configs`: hạ tầng (axios, query-client).
- `src/lib`: mock data, util và error helpers.
- `src/routes`: route-level composition và orchestration.

### ASCII sơ đồ kiến trúc

```text
web/
├─ src/
│  ├─ components/
│  │  ├─ ui/                # Design system (Shadcn)
│  │  └─ solodesk/          # CRM-specific components
│  ├─ features/
│  │  └─ deals/             # Deal module (Kanban + store)
│  ├─ configs/              # Axios + QueryClient
│  ├─ lib/                  # Mock data, helpers
│  ├─ routes/               # Route composition
│  └─ provider.tsx          # App-level providers
└─ package.json
```

### ASCII sơ đồ luồng dữ liệu chính

```text
[User Action]
    │
    ├─ drag/drop card, search, open modal
    │
    ▼
[Route Component: routes/index.tsx]
    │  local state: deals/query/activeId/modals
    │
    ├─ render columns/cards from state
    ├─ update state on DnD events (optimistic on UI)
    └─ pass callbacks into domain components
    ▼
[Domain Components]
    │ KanbanColumn / DealCard / AIPanel / ProposalModal / DealDetailModal
    ▼
[UI Re-render]

Future real API flow:
UI Event -> useMutation (React Query) -> axios client -> backend API -> DB
                     │
                     └-> rollback when request fails
```

## 🧩 Core Feature Matrix

| Nhóm tính năng | Mô tả hành vi | Thành phần chính | Trạng thái hiện tại | Độ mượt UI |
|---|---|---|---|---|
| Kanban Pipeline | Kéo-thả deal giữa stage, reorder trong cùng cột | `DndContext`, `KanbanColumn`, `DealCard` | Hoạt động với mock data | Mượt, có drag overlay + hover state |
| Lead Search | Lọc theo khách hàng/dự án | Search input + `useMemo` filter | Hoạt động | Phản hồi tức thì |
| AI Lead Qualifier | Phân tích nội dung lead, gợi ý score/rationale/reply | `AIPanel` | Hoạt động giả lập (timeout + heuristic) | Có loading animation + kết quả động |
| AI Proposal Draft | Tạo đề xuất dịch vụ tự động theo deal | `ProposalModal` | Hoạt động giả lập | Có skeleton/loading cảm giác realtime |
| Deal Detail | Xem lịch sử tương tác, thanh toán, tài liệu | `DealDetailModal` | Hoạt động | Trực quan, dễ scan thông tin |
| KPI Sidebar | Doanh thu, pipeline, win rate tổng hợp | `Sidebar` | Hoạt động từ state hiện tại | Cập nhật đồng bộ theo state |
| Server-state infra | Query client/devtools sẵn sàng cho API thật | `provider.tsx`, `query-client.ts` | Đã có hạ tầng | Chưa dùng full cho deals route |

## 📐 Project Conventions (Cho dev mới)

### 1) Nguyên tắc tách lớp

- UI thuần đặt trong `src/components/solodesk` hoặc `src/components/ui`.
- Logic nghiệp vụ đặt trong `src/features/<feature>/hooks`.
- Hạ tầng gọi API đặt trong `src/services` (đề xuất chuẩn hóa thêm, hiện chưa đầy đủ).
- Route chỉ nên làm orchestration, tránh nhồi toàn bộ business logic.

### 2) Quy chuẩn state

- UI state cục bộ: dùng `useState` ở route/component.
- Shared domain state: dùng Zustand store theo feature.
- Server state: bắt buộc đi qua React Query (`useQuery`, `useMutation`).
- API flow phải có đủ: `Loading` - `Success` - `Error`.
- Lỗi hệ thống/xác thực phải có toast tiếng Việt.

### 3) Quy chuẩn naming

- Logic/hook/service file: `camelCase`.
- Component file: `PascalCase`.
- UI text: tiếng Việt, ngắn gọn, định hướng hành động.

## 🔁 Code-level Transition: Mock -> Real API

Phần dưới dùng đúng stack hiện tại (Axios + TanStack Query + Zustand) để chuyển module deals từ mock sang API thật, có optimistic update + rollback.

### 1) Tạo service layer

```ts
// src/services/dealService.ts
import axiosClient from "@/configs/axios";

export type Stage =
  | "new_lead"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "active"
  | "completed";

export type DealDto = {
  id: string;
  client: string;
  projectType: string;
  value: number;
  score: "hot" | "warm" | "cold";
  stage: Stage;
  contact: string;
  channel: "Zalo" | "Email" | "Facebook";
};

export async function getDeals() {
  const { data } = await axiosClient.get<DealDto[]>("/api/deals");
  return data;
}

export async function updateDealStage(input: { id: string; stage: Stage }) {
  const { data } = await axiosClient.patch<DealDto>(`/api/deals/${input.id}/stage`, {
    stage: input.stage,
  });
  return data;
}
```

### 2) Tạo query/mutation hooks

```ts
// src/features/deals/hooks/useDealQueries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDeals, updateDealStage, type DealDto, type Stage } from "@/services/dealService";

const DEALS_KEY = ["deals"];

export function useDealsQuery() {
  return useQuery({
    queryKey: DEALS_KEY,
    queryFn: getDeals,
  });
}

export function useMoveDealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; stage: Stage }) => updateDealStage(input),

    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: DEALS_KEY });
      const previous = queryClient.getQueryData<DealDto[]>(DEALS_KEY) ?? [];

      queryClient.setQueryData<DealDto[]>(DEALS_KEY, (old = []) =>
        old.map((d) => (d.id === id ? { ...d, stage } : d)),
      );

      return { previous };
    },

    onError: (_error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(DEALS_KEY, ctx.previous);
      // TODO: toast.error("Cập nhật trạng thái thất bại. Vui lòng thử lại.")
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEALS_KEY });
    },
  });
}
```

### 3) Route integration

```tsx
// src/routes/index.tsx (rút gọn)
import { useDealsQuery, useMoveDealMutation } from "@/features/deals/hooks/useDealQueries";

function Index() {
  const dealsQuery = useDealsQuery();
  const moveDeal = useMoveDealMutation();

  if (dealsQuery.isLoading) return <div>Đang tải dữ liệu deal...</div>;
  if (dealsQuery.isError) return <div>Không thể tải deal. Vui lòng thử lại.</div>;

  const deals = dealsQuery.data ?? [];

  const onMoveDeal = (id: string, stage: Stage) => {
    moveDeal.mutate({ id, stage });
  };

  return (
    // render Kanban + gọi onMoveDeal trong onDragEnd
    <div>...</div>
  );
}
```

Kết quả: không cần đổi UI nhiều, chỉ thay data source từ `INITIAL_DEALS` sang query cache và mutation.

## 🧠 Extensibility Design

Checklist để scale an toàn từ MVP:

- Tách `src/services` theo domain (`dealService`, `clientService`, `paymentService`).
- Chuẩn hóa schema API bằng Zod trước khi ghi vào state để giảm bug runtime.
- Dùng React Query key convention rõ ràng (`["deals"]`, `["deals", id]`, ...).
- Tách DnD logic thành hook riêng (`useKanbanDnd`) để tái sử dụng cho nhiều board.
- Bổ sung telemetry: đo thời gian phản hồi drag-drop, tỷ lệ rollback mutation lỗi.
- Bật cơ chế feature flag cho AI workflows (A/B test prompt, UI, auto-reminder).

## ⚙️ Quick Start

```bash
bun install
bun run dev
```

Build production:

```bash
bun run build
```

## 🧪 Testing

Toolchain: **Vitest** (unit + component, jsdom) và **Playwright** (e2e đa trình duyệt — Chromium/Firefox/WebKit).

| Lệnh | Mục đích |
|---|---|
| `bun run test` | Vitest ở chế độ watch |
| `bun run test:run` | Chạy 1 lần (CI) |
| `bun run test:ui` | Vitest UI |
| `bun run test:coverage` | Báo cáo coverage (v8) |
| `bun run test:e2e` | Playwright e2e (tự khởi dev server) |
| `bun run test:e2e:ui` | Playwright UI mode |

```bash
# Unit & component
bun run test

# E2E — chạy 1 lần đầu để tải browser binaries
bunx playwright install
bun run test:e2e
```

- Unit/component test: đặt cạnh source dưới dạng `*.test.ts(x)` trong `src/`.
- E2E spec: `*.spec.ts` trong `e2e/`.
- Mọi business logic mới (hooks/utils/services) bắt buộc kèm test.

## 🗺️ Roadmap gần

- [ ] Đưa toàn bộ deals route sang React Query + API thật.
- [ ] Thêm toast tiếng Việt cho toàn bộ flow lỗi API.
- [ ] Chuẩn hóa folder `src/services` và thêm integration tests cho Kanban reorder.
- [ ] Kết nối backend persistence (PostgreSQL/Cloudflare D1/Firestore tùy kiến trúc triển khai).

## Admin API Pending Notes

Trang admin hiện chỉ hiển thị các nhóm chức năng đã có API thật để tránh làm người quản trị thấy các mục kỹ thuật chưa dùng được.

Đã có API:

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/{user_id}`
- `PATCH /api/v1/admin/users/{user_id}`: FE chỉ dùng để đổi `role` và `status`, không cho admin sửa tên hồ sơ người dùng.
- `GET /api/v1/admin/plans`
- `POST /api/v1/admin/plans`
- `PATCH /api/v1/admin/plans/{plan_id}`

Đang đợi 3 nhóm API theo requirement admin trong `Phieu_SU26SE083_VI.md`:

- System monitoring: cần API tổng hợp người dùng hoạt động, số tài liệu/báo giá/hợp đồng được tạo, số lượt AI generation, token đã dùng theo khoảng thời gian.
- AI cost monitoring: cần API tổng hợp chi phí token/API theo ngày/tháng, theo user, theo module AI.
- Template library: cần API CRUD mẫu điều khoản hợp đồng và mẫu báo giá theo loại nghề, có versioning và trạng thái active/inactive.

Khi backend expose các API trên, FE admin mới nên mở thêm các mục tương ứng trong sidebar. Không hiển thị các mục "chờ API" trực tiếp cho admin end-user.

## Freelancer Web Coverage Notes

Cập nhật ngày 29/06/2026. Phần này đối chiếu riêng trang dành cho Freelancer theo requirement trong `../Phieu_SU26SE083_VI.md`; không tính trang Admin. Nếu tính cả deliverable Mobile Flutter thì tỷ lệ tổng thể sẽ thấp hơn vì mobile hiện chưa có source chính trong repo này.

### Mức hoàn thành ước lượng

- FE Web dành cho Freelancer: khoảng **65-70%** so với requirement web.
- FE Web nếu chỉ tính phần đã nối API thật, hạn chế mock/local state: khoảng **60-65%**.
- FE tổng dự án nếu tính cả Mobile Flutter trong requirement: khoảng **45-50%**.

### FE Freelancer đã có

- Pipeline dự án: Kanban/list, thêm/sửa/xóa deal, chuyển stage, xem chi tiết deal.
- Hồ sơ khách hàng: danh sách, chi tiết khách hàng, thông tin liên hệ, lịch sử tương tác từ `comm-logs`.
- Dashboard doanh thu: đã gọi nhóm API analytics để lấy doanh thu, khoản còn phải thu, tỷ lệ thắng, khách hàng doanh thu cao.
- Intake public form: đã nối `GET /api/v1/intake/{share_token}/config`, render field theo cấu hình public và submit bằng `POST /api/v1/intake/{share_token}`.
- Cấu hình Intake Form: đã nối `GET /api/v1/intake-form`, `PUT /api/v1/intake-form`, map fields theo backend và dùng `share_url` thật để copy link chia sẻ.
- Báo giá AI: đã có modal tạo báo giá, gọi API tạo proposal bằng AI, chỉnh nội dung ở UI và đổi trạng thái gửi.
- Hợp đồng: đã có luồng tạo hợp đồng từ proposal đã được chấp nhận và gọi AI generate nội dung hợp đồng.
- Công việc dự án: tab task trong chi tiết deal đã nối API project/task.
- Nhắc nhở: đã có CRUD lịch nhắc theo deal, có chọn loại nhắc, kênh nhắc, thời gian và nội dung nháp.

### FE Freelancer còn thiếu hoặc chưa đủ

- Cài đặt hồ sơ freelancer còn lưu nhiều phần bằng `localStorage`: loại dịch vụ, mức giá, điều khoản hợp đồng mặc định, ngân hàng, MoMo, Zalo OA.
- Intake custom field chưa được backend nhận như field độc lập trong payload public; FE hiện gom custom field vào `inquiry_text`, nên chưa nên dùng custom field bắt buộc cho tới khi BE hỗ trợ custom field values.
- Chấm điểm lead thủ công chưa có flow rõ cho freelancer gõ/dán mô tả rồi bấm AI phân tích.
- Hóa đơn/thanh toán chưa có UI đầy đủ để tạo hóa đơn, gửi hóa đơn, ghi nhận thanh toán; hiện chủ yếu đọc invoice/payment trong detail.
- Hợp đồng chưa có trải nghiệm quản lý đầy đủ: sửa nội dung, gửi, ký, version/amend, export PDF thật.
- Nhắc nhở chưa có AI tạo nội dung theo giọng trang trọng/thân mật và chưa gửi thật qua Email/Zalo.
- Sidebar đang hiển thị Zalo/Email "Đã kết nối" cứng trong UI, trong khi backend gửi thật chưa hoàn chỉnh.

### Backend còn thiếu cho Freelancer requirement

- PDF worker chưa implement: `render_proposal_pdf`, `render_contract_pdf`, `render_invoice_pdf` trong `backend/src/workers/pdf_jobs/tasks.py` vẫn `NotImplemented`.
- Reminder worker chưa implement: `send_reminder`, `send_pending_reminders`, `mark_overdue_invoices`, `refresh_analytics_snapshots` trong `backend/src/workers/reminder_jobs/tasks.py` vẫn `NotImplemented`.
- Gửi thật qua Email/Zalo chưa hoàn chỉnh: các endpoint `send` của proposal/contract/invoice hiện chủ yếu đổi trạng thái, chưa tích hợp SendGrid/Zalo OA để giao tiếp thật với khách hàng.
- MoMo/link thanh toán chưa có tích hợp thật; hiện mới có dữ liệu/payment method ở domain invoice/payment.
- AI async chưa đủ: `generate_proposal_async`, `generate_contract_async`, `qualify_lead_async` trong `backend/src/workers/ai_jobs/tasks.py` vẫn chưa implement. Intake qualification async có triển khai một phần.
- Hồ sơ freelancer backend chưa đủ field theo requirement: service category, hourly rate, default contract terms, bank/MoMo/Zalo OA chưa được persist đầy đủ qua `/users/me`.
- Contract milestones mismatch: FE service có gọi `/contracts/{contract_id}/milestones`, nhưng backend router hiện chưa expose nhóm endpoint milestone này.

### Ưu tiên đề xuất tiếp theo cho FE

1. Làm màn hóa đơn/thanh toán đầy đủ: tạo hóa đơn, gửi hóa đơn, ghi nhận payment, lọc theo deal/client.
2. Hoàn thiện quản lý hợp đồng trong detail: xem/sửa/gửi/ký/amend/export, nhưng phần export PDF thật cần backend worker trước.
3. Chỉnh sidebar Zalo/Email thành trạng thái thật hoặc "Chưa kết nối" cho tới khi backend gửi thật sẵn sàng.
4. Sau khi backend hỗ trợ custom intake field values, bỏ cơ chế gom custom field vào `inquiry_text`.
5. Sau khi backend có reminder worker/gửi Email/Zalo, mở flow gửi nhắc thật và AI tạo nội dung nhắc theo giọng điệu.

## Brand Icon Assets

- Các icon dùng lại cho AI/Zalo/Email nằm trong `public/brand-icons`.
- FE gọi qua component `src/components/solodesk/BrandIcon.tsx`, nên chỉ cần thay file `ai.svg`, `logo_Zalo.webp`, `logo_Gmail.webp` là các nút liên quan tự cập nhật.
- Khi tải logo thật về, giữ nguyên tên file để không phải sửa lại code ở nhiều nơi.
