"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { ChipFamily } from "@/lib/content/schema";
import type { FirmwarePublic } from "../shared";
import { FlashEngine, isWebSerialSupported, type ChipInfo, type FlashPhase, type FlashProgress, type PrepareProgress } from "./engine";
import type { FlashError } from "./errors";

export interface FlasherState {
  phase: FlashPhase;
  supported: boolean | null; // null until mounted
  chip: ChipInfo | null;
  prepare: PrepareProgress | null;
  progress: FlashProgress | null;
  error: FlashError | null;
  incompatible: { detected: string; supported: ChipFamily[] } | null;
  done: { seconds: number; firmware: { id: string; name: string; version: string } } | null;
  log: string[];
}

type Action =
  | { type: "phase"; phase: FlashPhase }
  | { type: "supported"; value: boolean }
  | { type: "chip"; chip: ChipInfo }
  | { type: "prepare"; p: PrepareProgress }
  | { type: "progress"; p: FlashProgress }
  | { type: "incompatible"; detected: string; supported: ChipFamily[] }
  | { type: "done"; seconds: number; firmware: FlasherState["done"] extends infer D ? (D extends { firmware: infer F } ? F : never) : never }
  | { type: "error"; error: FlashError }
  | { type: "log"; line: string }
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
};

const MAX_LOG = 400;

function reducer(state: FlasherState, a: Action): FlasherState {
  switch (a.type) {
    case "supported":
      return { ...state, supported: a.value };
    case "phase":
      return { ...state, phase: a.phase };
    case "chip":
      return { ...state, chip: a.chip };
    case "prepare":
      return { ...state, prepare: a.p };
    case "progress":
      return { ...state, progress: a.p };
    case "incompatible":
      return { ...state, incompatible: { detected: a.detected, supported: a.supported } };
    case "done":
      return { ...state, done: { seconds: a.seconds, firmware: a.firmware } };
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
    case "reset":
      return { ...initial, supported: state.supported };
    default:
      return state;
  }
}

export interface UseFlasherOptions {
  baudrate?: number;
  eraseAll?: boolean;
}

export function useFlasher(firmware: FirmwarePublic, options: UseFlasherOptions = {}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const engineRef = useRef<FlashEngine | null>(null);
  const { baudrate, eraseAll } = options;

  useEffect(() => {
    dispatch({ type: "supported", value: isWebSerialSupported() });
  }, []);

  useEffect(() => {
    return () => {
      void engineRef.current?.abort();
    };
  }, []);

  const start = useCallback(async () => {
    if (engineRef.current && !["idle", "done", "error", "incompatible"].includes(engineRef.current.currentPhase)) return;
    dispatch({ type: "reset" });
    const engine = new FlashEngine({
      firmware,
      baudrate,
      eraseAll,
      events: {
        onPhase: (phase) => dispatch({ type: "phase", phase }),
        onLog: (line) => dispatch({ type: "log", line }),
        onChip: (chip) => dispatch({ type: "chip", chip }),
        onPrepare: (p) => dispatch({ type: "prepare", p }),
        onProgress: (p) => dispatch({ type: "progress", p }),
        onIncompatible: (detected, supported) => dispatch({ type: "incompatible", detected, supported }),
        onDone: ({ seconds, firmware: fw }) => dispatch({ type: "done", seconds, firmware: fw }),
        onError: (error) => dispatch({ type: "error", error }),
      },
    });
    engineRef.current = engine;
    await engine.run();
  }, [firmware, baudrate, eraseAll]);

  const abort = useCallback(async () => {
    await engineRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const busy = useMemo(
    () => !["idle", "done", "error", "incompatible"].includes(state.phase),
    [state.phase],
  );

  return { state, start, abort, reset, busy };
}
