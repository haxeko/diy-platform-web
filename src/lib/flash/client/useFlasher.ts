"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { ChipFamily } from "@/lib/content/schema";
import type { FirmwarePublic } from "../shared";
import {
  FlashEngine,
  isBusyPhase,
  isWebSerialSupported,
  type ChipInfo,
  type FlashPhase,
  type FlashProgress,
  type PairingInfo,
  type PrepareProgress,
} from "./engine";
import type { FlashError } from "./errors";

export interface FlasherState {
  phase: FlashPhase;
  supported: boolean | null; // null until mounted
  chip: ChipInfo | null;
  prepare: PrepareProgress | null;
  progress: FlashProgress | null;
  error: FlashError | null;
  incompatible: { detected: string; supported: ChipFamily[]; reason: "chip" | "flash-too-small" } | null;
  done: { seconds: number; bytes: number; firmware: { id: string; name: string; version: string } } | null;
  log: string[];
  monitor: { open: boolean; lines: string[]; pairing: PairingInfo | null };
}

type Action =
  | { type: "phase"; phase: FlashPhase }
  | { type: "supported"; value: boolean }
  | { type: "chip"; chip: ChipInfo }
  | { type: "prepare"; p: PrepareProgress }
  | { type: "progress"; p: FlashProgress }
  | { type: "incompatible"; detected: string; supported: ChipFamily[]; reason: "chip" | "flash-too-small" }
  | { type: "done"; done: NonNullable<FlasherState["done"]> }
  | { type: "error"; error: FlashError }
  | { type: "log"; line: string }
  | { type: "monitor"; open: boolean }
  | { type: "monitor-line"; line: string }
  | { type: "pairing"; pairing: PairingInfo }
  | { type: "reset" };

const initial: FlasherState = {
  phase: "idle",
  supported: null,
  chip: null,
  prepare: null,
  progress: null,
  error: null,
  incompatible: null,
  done: null,
  log: [],
  monitor: { open: false, lines: [], pairing: null },
};

const MAX_LOG = 400;
const MAX_MONITOR = 600;

function reducer(state: FlasherState, a: Action): FlasherState {
  switch (a.type) {
    case "supported":
      return { ...state, supported: a.value };
    case "phase":
      return { ...state, phase: a.phase, ...(a.phase === "detected" ? { error: null, incompatible: null } : {}) };
    case "chip":
      return { ...state, chip: a.chip };
    case "prepare":
      return { ...state, prepare: a.p };
    case "progress":
      return { ...state, progress: a.p };
    case "incompatible":
      return { ...state, incompatible: { detected: a.detected, supported: a.supported, reason: a.reason } };
    case "done":
      return { ...state, done: a.done };
    case "error":
      return { ...state, error: a.error };
    case "log": {
      // esptool-js streams progress dots with `write` (no newline); glue them to the last line.
      const line = a.line.replace(/\r/g, "");
      if (!line.trim()) return state;
      const log = state.log.length >= MAX_LOG ? state.log.slice(-MAX_LOG + 1) : state.log.slice();
      if (line === "." && log.length) log[log.length - 1] = `${log[log.length - 1]}.`;
      else log.push(line.replace(/\n$/, ""));
      return { ...state, log };
    }
    case "monitor":
      return { ...state, monitor: { ...state.monitor, open: a.open, ...(a.open ? { lines: [], pairing: null } : {}) } };
    case "monitor-line": {
      const lines = state.monitor.lines.length >= MAX_MONITOR ? state.monitor.lines.slice(-MAX_MONITOR + 1) : state.monitor.lines.slice();
      lines.push(a.line);
      return { ...state, monitor: { ...state.monitor, lines } };
    }
    case "pairing":
      return { ...state, monitor: { ...state.monitor, pairing: a.pairing } };
    case "reset":
      return { ...initial, supported: state.supported };
    default:
      return state;
  }
}

export interface UseFlasherOptions {
  baudrate?: number;
}

export function useFlasher(firmware: FirmwarePublic, options: UseFlasherOptions = {}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const engineRef = useRef<FlashEngine | null>(null);
  const { baudrate } = options;

  useEffect(() => {
    dispatch({ type: "supported", value: isWebSerialSupported() });
  }, []);

  useEffect(() => {
    return () => {
      void engineRef.current?.abort();
    };
  }, []);

  const connect = useCallback(async () => {
    const current = engineRef.current;
    if (current && (isBusyPhase(current.currentPhase) || current.currentPhase === "detected")) return;
    dispatch({ type: "reset" });
    const engine = new FlashEngine({
      firmware,
      baudrate,
      events: {
        onPhase: (phase) => dispatch({ type: "phase", phase }),
        onLog: (line) => dispatch({ type: "log", line }),
        onChip: (chip) => dispatch({ type: "chip", chip }),
        onPrepare: (p) => dispatch({ type: "prepare", p }),
        onProgress: (p) => dispatch({ type: "progress", p }),
        onIncompatible: (detected, supported, reason) => dispatch({ type: "incompatible", detected, supported, reason }),
        onDone: ({ seconds, bytes, firmware: fw }) => dispatch({ type: "done", done: { seconds, bytes, firmware: fw } }),
        onError: (error) => dispatch({ type: "error", error }),
        onMonitor: (s) => dispatch({ type: "monitor", open: s === "open" }),
        onMonitorLine: (line) => dispatch({ type: "monitor-line", line }),
        onPairing: (pairing) => dispatch({ type: "pairing", pairing }),
      },
    });
    engineRef.current = engine;
    await engine.connect();
  }, [firmware, baudrate]);

  const flash = useCallback(async (eraseAll: boolean) => {
    await engineRef.current?.flash({ eraseAll });
  }, []);

  const disconnect = useCallback(async () => {
    await engineRef.current?.disconnect();
  }, []);

  const abort = useCallback(async () => {
    await engineRef.current?.abort();
  }, []);

  const startMonitor = useCallback(async () => {
    await engineRef.current?.startMonitor();
  }, []);

  const stopMonitor = useCallback(async () => {
    await engineRef.current?.stopMonitor();
  }, []);

  const reset = useCallback(() => {
    void engineRef.current?.stopMonitor();
    engineRef.current = null;
    dispatch({ type: "reset" });
  }, []);

  const busy = useMemo(() => isBusyPhase(state.phase), [state.phase]);

  return { state, connect, flash, disconnect, abort, reset, startMonitor, stopMonitor, busy };
}
