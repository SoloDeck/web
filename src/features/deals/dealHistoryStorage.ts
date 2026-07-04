// Backend chưa có API lưu lịch sử cấp-deal (xem deal_activity_entries trong DB,
// bảng tồn tại nhưng không có endpoint đọc/ghi). Trước đây FE mượn comm-logs của
// client để lưu tạm, nhưng comm-logs là theo client_id nên các deal chung 1 client
// bị lẫn lịch sử của nhau. Tạm thời lưu cục bộ theo từng deal cho tới khi BE có API thật.
export type DealHistoryEntry = {
  id: string;
  date: string;
  text: string;
  channel?: string;
};

const STORAGE_PREFIX = "solodesk.deal-history.";
const UPDATE_EVENT = "solodesk:deal-history-updated";

function storageKey(dealId: string): string {
  return `${STORAGE_PREFIX}${dealId}`;
}

function readFromStorage(dealId: string): DealHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(storageKey(dealId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore yêu cầu getSnapshot trả về cùng reference nếu dữ liệu
// chưa đổi, nếu không sẽ re-render liên tục. Cache lại theo dealId.
const snapshotCache = new Map<string, DealHistoryEntry[]>();

export function getDealHistory(dealId: string): DealHistoryEntry[] {
  const fresh = readFromStorage(dealId);
  const cached = snapshotCache.get(dealId);
  if (cached && cached.length === fresh.length && cached.every((entry, i) => entry.id === fresh[i]?.id)) {
    return cached;
  }
  snapshotCache.set(dealId, fresh);
  return fresh;
}

export function addDealHistoryEntry(dealId: string, entry: Omit<DealHistoryEntry, "id">): void {
  const current = getDealHistory(dealId);
  const next: DealHistoryEntry[] = [...current, { ...entry, id: crypto.randomUUID() }];
  window.localStorage.setItem(storageKey(dealId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { dealId } }));
}

export function subscribeDealHistory(dealId: string, callback: () => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ dealId: string }>).detail;
    if (!detail || detail.dealId === dealId) callback();
  };
  window.addEventListener(UPDATE_EVENT, handler);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(UPDATE_EVENT, handler);
    window.removeEventListener("storage", callback);
  };
}
