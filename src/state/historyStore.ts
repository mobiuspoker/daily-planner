import { create } from "zustand";
import { 
  getDistinctDays, 
  getByDay, 
  searchHistory as searchHistoryService,
  getMonthDays,
  getTotalHistoryCount,
  type HistoryItem, 
  type DayWithHistory 
} from "../services/historyService";
import { DateTime } from "luxon";

interface HistoryStore {
  days: DayWithHistory[];
  monthDays: DayWithHistory[];
  selectedDay: string | null;
  items: HistoryItem[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
  currentMonth: DateTime;
  totalCount: number;
  
  loadDays: (limit?: number, offset?: number) => Promise<void>;
  loadMonthDays: (year: number, month: number) => Promise<void>;
  selectDay: (day: string | null) => Promise<void>;
  searchInDay: (text: string) => Promise<void>;
  searchAll: (text: string) => Promise<void>;
  clearSearch: () => void;
  setCurrentMonth: (month: DateTime) => void;
  navigateMonth: (direction: "prev" | "next") => void;
  loadTotalCount: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  days: [],
  monthDays: [],
  selectedDay: null,
  items: [],
  searchQuery: "",
  loading: false,
  error: null,
  currentMonth: DateTime.local(),
  totalCount: 0,
  
  loadDays: async (limit = 90, offset = 0) => {
    set({ loading: true, error: null });
    try {
      const days = await getDistinctDays(limit, offset);
      set({ days, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to load days",
        loading: false 
      });
    }
  },
  
  loadMonthDays: async (year: number, month: number) => {
    set({ loading: true, error: null });
    try {
      const monthDays = await getMonthDays(year, month);
      set({ monthDays, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to load month days",
        loading: false 
      });
    }
  },
  
  selectDay: async (day: string | null) => {
    if (!day) {
      set({ selectedDay: null });
      return;
    }
    set({ loading: true, error: null, selectedDay: day });
    try {
      const items = await getByDay(day, get().searchQuery || undefined);
      set({ items, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to load day items",
        loading: false 
      });
    }
  },
  
  searchInDay: async (text: string) => {
    const { selectedDay } = get();
    if (!selectedDay) return;
    
    set({ searchQuery: text, loading: true, error: null });
    try {
      const items = await getByDay(selectedDay, text || undefined);
      set({ items, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to search in day",
        loading: false 
      });
    }
  },
  
  searchAll: async (text: string) => {
    set({ searchQuery: text, loading: true, error: null, selectedDay: null });
    try {
      const items = await searchHistoryService(text);
      set({ items, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to search history",
        loading: false 
      });
    }
  },
  
  clearSearch: () => {
    set({ searchQuery: "", items: [] });
  },
  
  setCurrentMonth: (month: DateTime) => {
    set({ currentMonth: month });
    get().loadMonthDays(month.year, month.month);
  },
  
  navigateMonth: (direction: "prev" | "next") => {
    const { currentMonth } = get();
    const newMonth = direction === "prev" 
      ? currentMonth.minus({ months: 1 })
      : currentMonth.plus({ months: 1 });
    
    set({ currentMonth: newMonth });
    get().loadMonthDays(newMonth.year, newMonth.month);
  },
  
  loadTotalCount: async () => {
    try {
      const count = await getTotalHistoryCount();
      set({ totalCount: count });
    } catch (error) {
      console.error("Failed to load total count:", error);
    }
  }
}));