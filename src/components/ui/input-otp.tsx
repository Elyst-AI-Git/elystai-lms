"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InputOTPContextValue = {
  disabled?: boolean;
  maxLength: number;
  setSlotRef: (index: number, node: HTMLInputElement | null) => void;
  updateValue: (index: number, value: string) => void;
  // Fixed-width per-slot chars (index i = slot i), NOT a collapsed string —
  // joining would lose empty-slot positions and shift rendering out of sync
  // with what updateValue writes by index.
  slots: string[];
  focusSlot: (index: number) => void;
};

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function useInputOTP() {
  const context = React.useContext(InputOTPContext);
  if (!context) {
    throw new Error("InputOTP components must be used inside InputOTP");
  }
  return context;
}

type InputOTPProps = {
  children: React.ReactNode;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  maxLength: number;
  onChange?: (value: string) => void;
  value?: string;
};

// Build a fixed-width array of `maxLength` slots from a plain digit string,
// e.g. ("12", 6) -> ["1", "2", "", "", "", ""]. Index i of the array always
// corresponds to slot i, so per-slot edits never shift a neighboring digit.
function toSlots(source: string, maxLength: number): string[] {
  const digits = source.replace(/\D/g, "").slice(0, maxLength);
  return Array.from({ length: maxLength }, (_, i) => digits[i] ?? "");
}

export function InputOTP({
  children,
  className,
  defaultValue = "",
  disabled,
  maxLength,
  onChange,
  value,
}: InputOTPProps) {
  // Per-slot state is the source of truth for rendering, kept ALWAYS at a
  // fixed width. Serializing to a plain string (for onChange / the `value`
  // prop) only happens at the edges, never mid-edit — that's what previously
  // let editing an arbitrary slot compact the string and shift every digit
  // after it left by one position.
  const [slots, setSlots] = React.useState<string[]>(() => toSlots(value ?? defaultValue, maxLength));
  const slotRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  // Resync when the parent replaces `value` from outside this component
  // (e.g. clearing it back to "" on "Back" / sign-out). Comparing against
  // the joined slots (not a ref to the last prop) means this only fires on
  // real external changes, not on the round-trip from our own onChange.
  React.useEffect(() => {
    if (value !== undefined && value !== slots.join("")) {
      setSlots(toSlots(value, maxLength));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, maxLength]);

  const updateValue = React.useCallback(
    (index: number, rawValue: string) => {
      const cleanValue = rawValue.replace(/\D/g, "");
      const nextSlots = [...slots];

      if (cleanValue.length > 1) {
        cleanValue
          .slice(0, maxLength - index)
          .split("")
          .forEach((char, offset) => {
            nextSlots[index + offset] = char;
          });
        setSlots(nextSlots);
        onChange?.(nextSlots.join(""));
        slotRefs.current[Math.min(index + cleanValue.length, maxLength - 1)]?.focus();
        return;
      }

      nextSlots[index] = cleanValue;
      setSlots(nextSlots);
      onChange?.(nextSlots.join(""));
      if (cleanValue && index < maxLength - 1) {
        slotRefs.current[index + 1]?.focus();
      }
    },
    [slots, maxLength, onChange]
  );

  const setSlotRef = React.useCallback((index: number, node: HTMLInputElement | null) => {
    slotRefs.current[index] = node;
  }, []);

  const focusSlot = React.useCallback(
    (index: number) => {
      if (index >= 0 && index < maxLength) {
        slotRefs.current[index]?.focus();
      }
    },
    [maxLength]
  );

  return (
    <InputOTPContext.Provider value={{ disabled, maxLength, setSlotRef, updateValue, slots, focusSlot }}>
      <div className={cn("flex items-center justify-center", className)}>{children}</div>
    </InputOTPContext.Provider>
  );
}

export function InputOTPGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}

export function InputOTPSlot({
  className,
  index,
}: {
  className?: string;
  index: number;
}) {
  const { disabled, setSlotRef, updateValue, slots, focusSlot } = useInputOTP();
  const char = slots[index] ?? "";

  return (
    <input
      ref={(node) => setSlotRef(index, node)}
      aria-label={`Digit ${index + 1}`}
      autoComplete={index === 0 ? "one-time-code" : "off"}
      className={cn(
        "h-12 w-10 sm:h-14 sm:w-12 rounded-lg border-2 border-muted/80 bg-[#FDFEFC] text-center font-mono text-[20px] sm:text-[22px] font-extrabold text-fg shadow-sm outline-none transition duration-200 focus:border-emerald focus:ring-2 focus:ring-emerald/20 disabled:opacity-50",
        className
      )}
      disabled={disabled}
      inputMode="numeric"
      maxLength={1}
      onChange={(event) => updateValue(index, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Backspace" && !char && index > 0) {
          focusSlot(index - 1);
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        updateValue(index, event.clipboardData.getData("text"));
      }}
      pattern="[0-9]*"
      type="text"
      value={char}
    />
  );
}
