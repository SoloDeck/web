import { useSyncExternalStore } from "react";
import type { LeadScore } from "@/features/deals/types";

export type QualificationScoreItem = {
  key?: string;
  label: string;
  points: number;
  max_points: number;
  reason?: string | null;
  impact?: "positive" | "neutral" | "negative" | null;
};

export type DealQualificationDocument = {
  id: string;
  createdAt: string;
  score: number;
  level: LeadScore;
  label: string;
  rationale: string;
  recommendation: string;
  signals: string[];
  // Ba trường dưới đây thêm sau. Bản lưu cũ KHÔNG có, nên đều optional — đọc bản cũ
  // vẫn phải chạy, không được nổ.  #Huynh
  breakdown?: QualificationScoreItem[];
  win?: { score: number; level: string; factors: QualificationScoreItem[] } | null;
  redFlags?: string[];
};

const STORAGE_PREFIX = "solodesk.deal-qualification-docs.";
const UPDATE_EVENT = "solodesk:deal-qualification-docs-updated";
const EMPTY_QUALIFICATION_DOCS: DealQualificationDocument[] = [];

function storageKey(dealId: string): string {
  return `${STORAGE_PREFIX}${dealId}`;
}

function readFromStorage(dealId: string): DealQualificationDocument[] {
  try {
    const raw = window.localStorage.getItem(storageKey(dealId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const snapshotCache = new Map<string, DealQualificationDocument[]>();

export function getDealQualificationDocuments(dealId: string): DealQualificationDocument[] {
  const fresh = readFromStorage(dealId);
  const cached = snapshotCache.get(dealId);
  if (cached && cached.length === fresh.length && cached.every((entry, index) => entry.id === fresh[index]?.id)) {
    return cached;
  }
  snapshotCache.set(dealId, fresh);
  return fresh;
}

export function addDealQualificationDocument(
  dealId: string,
  document: Omit<DealQualificationDocument, "id" | "createdAt">
): DealQualificationDocument {
  const nextDocument: DealQualificationDocument = {
    ...document,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [nextDocument, ...getDealQualificationDocuments(dealId)];
  window.localStorage.setItem(storageKey(dealId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { dealId } }));
  return nextDocument;
}

export function subscribeDealQualificationDocuments(dealId: string, callback: () => void): () => void {
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

export function useDealQualificationDocuments(dealId?: string): DealQualificationDocument[] {
  return useSyncExternalStore(
    (callback) => (dealId ? subscribeDealQualificationDocuments(dealId, callback) : () => {}),
    () => (dealId ? getDealQualificationDocuments(dealId) : EMPTY_QUALIFICATION_DOCS),
    () => EMPTY_QUALIFICATION_DOCS
  );
}
