import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientEditDialog } from "@/features/clients/components/ClientEditDialog";
import { useUpdateClient } from "@/features/clients/hooks/useClients";
import type { ClientRecord } from "@/services/clientsService";

vi.mock("@/features/clients/hooks/useClients", () => ({ useUpdateClient: vi.fn() }));

/**
 * Trạng thái khách chỉ còn hai lựa chọn — Tiềm năng và Lưu trữ — khớp bộ lọc ở Hồ sơ khách hàng.
 * Chọn "Lưu trữ" ở đây có hậu quả y hệt bấm nút lưu trữ: dự án đang chạy của khách tự vào Kho lưu
 * trữ. Nên hộp phải nói trước điều đó, và chỉ báo "đang lưu trữ" đúng lần CHUYỂN sang lưu trữ.
 */

const mutate = vi.fn();

function khach(over: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "c1",
    owner_user_id: "u1",
    name: "Hỏa Quốc huynh",
    email: "a@b.c",
    phone: "0352015349",
    type: "individual",
    status: "prospect",
    website: null,
    linkedin_url: null,
    address_city: null,
    address_country: null,
    notes: null,
    description: null,
    deal_count: 3,
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
    ...over,
  };
}

function mo(over: Partial<ClientRecord> = {}) {
  render(<ClientEditDialog client={khach(over)} open onClose={vi.fn()} />);
}

const oTrangThai = () => screen.getAllByRole("combobox")[1]; // [0] = Loại khách hàng

beforeEach(() => {
  mutate.mockClear();
  vi.mocked(useUpdateClient).mockReturnValue({
    mutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateClient>);
});

describe("<ClientEditDialog /> — trạng thái", () => {
  it("chỉ có hai lựa chọn: Tiềm năng và Lưu trữ", async () => {
    mo();

    await userEvent.click(oTrangThai());

    const mucs = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(mucs).toEqual(["Tiềm năng", "Lưu trữ"]);
  });

  it("khách mang trạng thái cũ (đang hợp tác...) được hiện là Tiềm năng", () => {
    mo({ status: "active" });

    expect(oTrangThai()).toHaveTextContent("Tiềm năng");
  });

  it("khách đã lưu trữ thì hiện đúng là Lưu trữ", () => {
    mo({ status: "archived" });

    expect(oTrangThai()).toHaveTextContent("Lưu trữ");
  });

  it("chọn Lưu trữ thì nói trước: dự án đang chạy của khách sẽ tự vào Kho lưu trữ", async () => {
    mo();
    expect(screen.queryByText(/tự động đưa vào Kho lưu trữ/)).toBeNull();

    await userEvent.click(oTrangThai());
    await userEvent.click(await screen.findByRole("option", { name: "Lưu trữ" }));

    expect(
      screen.getByText("Các dự án đang chạy của khách hàng sẽ tự động đưa vào Kho lưu trữ.")
    ).toBeInTheDocument();
  });

  it("khách đã lưu trữ từ trước thì không lặp lại lời nhắc đó", () => {
    mo({ status: "archived" });

    expect(screen.queryByText(/tự động đưa vào Kho lưu trữ/)).toBeNull();
  });
});

describe("<ClientEditDialog /> — lưu", () => {
  it("đổi từ Tiềm năng sang Lưu trữ rồi lưu thì báo là lần CHUYỂN sang lưu trữ", async () => {
    mo();
    await userEvent.click(oTrangThai());
    await userEvent.click(await screen.findByRole("option", { name: "Lưu trữ" }));

    await userEvent.click(screen.getByRole("button", { name: /lưu/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const bien = mutate.mock.calls[0][0];
    expect(bien.id).toBe("c1");
    expect(bien.payload.status).toBe("archived");
    expect(bien.archiving).toBe(true);
  });

  it("sửa thông tin mà không đổi trạng thái thì KHÔNG báo lưu trữ", async () => {
    mo();

    await userEvent.click(screen.getByRole("button", { name: /lưu/i }));

    const bien = mutate.mock.calls[0][0];
    expect(bien.payload.status).toBe("prospect");
    expect(bien.archiving).toBe(false);
  });

  it("sửa thông tin của khách ĐÃ lưu trữ thì vẫn giữ Lưu trữ và KHÔNG báo lưu trữ lần nữa", async () => {
    mo({ status: "archived" });

    await userEvent.click(screen.getByRole("button", { name: /lưu/i }));

    const bien = mutate.mock.calls[0][0];
    expect(bien.payload.status).toBe("archived");
    expect(bien.archiving).toBe(false);
  });
});
