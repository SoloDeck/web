import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientRecords } from "./ClientRecords";
import { useClients, useUpdateClient } from "@/features/clients/hooks/useClients";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import type { ClientRecord } from "@/services/clientsService";

vi.mock("@/features/clients/hooks/useClients", () => ({
  useClients: vi.fn(),
  useUpdateClient: vi.fn(),
}));

function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "c1",
    owner_user_id: "u1",
    name: "Công ty ABC",
    email: "abc@example.com",
    phone: "0900000000",
    type: "company",
    status: "active",
    website: null,
    linkedin_url: null,
    address_city: null,
    address_country: null,
    notes: null,
    description: null,
    deal_count: 2,
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
    ...overrides,
  };
}

function mockUseClients(data: ClientRecord[] | undefined, isLoading = false) {
  vi.mocked(useClients).mockReturnValue({ data, isLoading } as ReturnType<typeof useClients>);
}

beforeEach(() => {
  useDealStore.setState({ deals: [], hydrated: true });
  vi.mocked(useUpdateClient).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateClient>);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<ClientRecords />", () => {
  it("renders client rows from the API response", () => {
    mockUseClients([makeClient({ name: "Công ty ABC" }), makeClient({ id: "c2", name: "Nguyễn Văn B", type: "individual" })]);

    render(<ClientRecords onOpenClient={vi.fn()} />);

    expect(screen.getByText("Công ty ABC")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn B")).toBeInTheDocument();
    // deal_count comes straight from the API payload.
    expect(screen.getAllByText(/2 dự án/).length).toBeGreaterThan(0);
  });

  it("shows the empty state when the API returns no clients", () => {
    mockUseClients([]);

    render(<ClientRecords onOpenClient={vi.fn()} />);

    expect(screen.getByText(/Chưa có khách hàng nào/)).toBeInTheDocument();
  });

  it("shows the loading state while the query is pending", () => {
    mockUseClients(undefined, true);

    render(<ClientRecords onOpenClient={vi.fn()} />);

    expect(screen.getByText(/Đang tải/)).toBeInTheDocument();
  });
});
