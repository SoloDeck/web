import { create } from 'zustand';

export type DealStatus = 'new_lead' | 'qualified' | 'active' | 'done';

export interface Deal {
  id: string;
  clientName: string;
  value: number; // VNĐ
  status: DealStatus;
  aiScore: number; // 0 - 100
}

interface DealState {
  deals: Deal[];
  isLoading: boolean;
  error: string | null;
  moveDeal: (dealId: string, newStatus: DealStatus) => void;
  setDeals: (updater: (prevDeals: Deal[]) => Deal[]) => void;
}

const MOCK_DEALS: Deal[] = [
  { id: '1', clientName: 'Nguyễn Văn A - Thiết kế Web', value: 15000000, status: 'new_lead', aiScore: 85 },
  { id: '2', clientName: 'Trần Thị B - App Mobile', value: 45000000, status: 'new_lead', aiScore: 60 },
  { id: '3', clientName: 'Công ty C - Viết content', value: 5000000, status: 'qualified', aiScore: 92 },
  { id: '4', clientName: 'Anh D - Tối ưu SEO', value: 12000000, status: 'active', aiScore: 78 },
  { id: '5', clientName: 'Chị E - Chạy Ads FB', value: 20000000, status: 'done', aiScore: 95 },
];

export const useDealStore = create<DealState>((set) => ({
  deals: MOCK_DEALS,
  isLoading: false,
  error: null,
  
  moveDeal: (dealId, newStatus) => {
    set((state) => {
      const updatedDeals = state.deals.map((deal) => 
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      );
      
      return { deals: updatedDeals };
    });
  },

  setDeals: (updater) => set((state) => ({ deals: updater(state.deals) })),
}));
