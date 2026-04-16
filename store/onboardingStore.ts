import { create } from "zustand";

import type { Gender } from "@/types/database";

export type IntentOption = "serious" | "casual" | "exploring" | null;

interface PromptAnswer {
  prompt: string;
  answer: string;
}

interface OnboardingState {
  photoUrls: string[];
  prompts: PromptAnswer[];
  intent: IntentOption;
  fullName: string;
  age: number | null;
  gender: Gender | null;
  setPhotoAt: (index: number, url: string) => void;
  setPrompts: (prompts: PromptAnswer[]) => void;
  setIntent: (intent: IntentOption) => void;
  setBasicInfo: (payload: { fullName: string; age: number; gender: Gender }) => void;
  clearOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  photoUrls: [],
  prompts: [],
  intent: null,
  fullName: "",
  age: null,
  gender: null,
  setPhotoAt: (index, url) =>
    set((state) => {
      const next = [...state.photoUrls];
      next[index] = url;
      return { photoUrls: next.filter(Boolean) };
    }),
  setPrompts: (prompts) => set({ prompts }),
  setIntent: (intent) => set({ intent }),
  setBasicInfo: ({ fullName, age, gender }) => set({ fullName, age, gender }),
  clearOnboarding: () =>
    set({
      photoUrls: [],
      prompts: [],
      intent: null,
      fullName: "",
      age: null,
      gender: null,
    }),
}));
