"use client";

import { useMutation } from "@tanstack/react-query";

import { extractVideo } from "@/features/extraction/api";

export function useExtractVideo() {
  return useMutation({ mutationFn: extractVideo });
}
