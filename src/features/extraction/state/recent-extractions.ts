"use client";

import { create } from "zustand";

import type { ExtractionResult } from "@/features/extraction/types";

type RecentExtractionState = {
  items: ExtractionResult[];
  add: (item: ExtractionResult) => void;
};

export const useRecentExtractions = create<RecentExtractionState>((set) => ({
  items: [],
  add: (item) =>
    set((state) => ({
      items: [item, ...state.items.filter((existing) => existing.id !== item.id)].slice(0, 5)
    }))
}));
