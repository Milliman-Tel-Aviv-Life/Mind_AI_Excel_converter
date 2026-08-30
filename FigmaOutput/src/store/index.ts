import { create } from "zustand";
import type {
  WorkbookSummary,
  ValidationReport,
  PrepAction,
  Version,
  ChatMessage,
  Mode,
  Delta,
  FixTarget,
  RecalcResult,
} from "../types";

interface SessionState {
  sessionId: string | null;
  mode: Mode;
  summary: WorkbookSummary | null;
  report: ValidationReport | null;
  plan: PrepAction[];
  versions: Version[];
  currentVersion: Version | null;
  chatHistory: ChatMessage[];
  isUploading: boolean;
  isAnalyzing: boolean;
  /** Result of the most recent re-analysis in this session (null until one ran). */
  lastDelta: Delta | null;
  /** Finding the Fix panel is open for (null = closed). */
  fixTarget: FixTarget | null;
  /** Last real Excel recalculation in this session (shared by the Recalculate screen and the Fix panel). */
  recalcResult: RecalcResult | null;
  setRecalcResult: (r: RecalcResult | null) => void;

  setMode: (mode: Mode) => void;
  setSession: (
    sessionId: string,
    summary: WorkbookSummary,
    report: ValidationReport,
    plan: PrepAction[],
    version: Version
  ) => void;
  setReport: (report: ValidationReport, plan: PrepAction[]) => void;
  setSummary: (summary: WorkbookSummary) => void;
  addVersion: (version: Version) => void;
  setVersions: (versions: Version[]) => void;
  setCurrentVersion: (version: Version) => void;
  setChatHistory: (messages: ChatMessage[]) => void;
  appendChatMessage: (message: ChatMessage) => void;
  setIsUploading: (v: boolean) => void;
  setIsAnalyzing: (v: boolean) => void;
  setLastDelta: (delta: Delta | null) => void;
  openFix: (target: FixTarget) => void;
  closeFix: () => void;
  /** Apply a fresh analysis (summary/report/plan, optional delta and versions) in one go. */
  applyAnalysis: (a: { summary?: WorkbookSummary; report?: ValidationReport; plan?: PrepAction[]; delta?: Delta; versions?: Version[] }) => void;
  resetSession: () => void;
}

export const useStore = create<SessionState>((set) => ({
  sessionId: null,
  mode: "plan",
  summary: null,
  report: null,
  plan: [],
  versions: [],
  currentVersion: null,
  chatHistory: [],
  isUploading: false,
  isAnalyzing: false,
  lastDelta: null,
  fixTarget: null,
  recalcResult: null,
  setRecalcResult: (recalcResult) => set({ recalcResult }),

  setMode: (mode) => set({ mode }),
  setSession: (sessionId, summary, report, plan, version) =>
    set({ sessionId, summary, report, plan, versions: [version], currentVersion: version, lastDelta: null, fixTarget: null, recalcResult: null }),
  setReport: (report, plan) => set({ report, plan }),
  setSummary: (summary) => set({ summary }),
  addVersion: (version) =>
    set((s) => ({ versions: [...s.versions.filter((v) => v.id !== version.id), version], currentVersion: version })),
  setVersions: (versions) => set({ versions }),
  setCurrentVersion: (version) => set({ currentVersion: version }),
  setChatHistory: (chatHistory) => set({ chatHistory }),
  appendChatMessage: (message) =>
    set((s) => ({ chatHistory: [...s.chatHistory, message] })),
  setIsUploading: (isUploading) => set({ isUploading }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setLastDelta: (lastDelta) => set({ lastDelta }),
  openFix: (fixTarget) => set({ fixTarget }),
  closeFix: () => set({ fixTarget: null }),
  applyAnalysis: (a) =>
    set((s) => ({
      summary: a.summary ?? s.summary,
      report: a.report ?? s.report,
      plan: a.plan ?? s.plan,
      lastDelta: a.delta ?? s.lastDelta,
      versions: a.versions ?? s.versions,
    })),
  resetSession: () =>
    set({
      sessionId: null,
      summary: null,
      report: null,
      plan: [],
      versions: [],
      currentVersion: null,
      chatHistory: [],
      isUploading: false,
      isAnalyzing: false,
      lastDelta: null,
      fixTarget: null,
      recalcResult: null,
    }),
}));
