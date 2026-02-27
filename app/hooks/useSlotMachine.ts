import { useRef, useState } from "react";

import type { Stratagem } from "@/app/types/stratagem";

interface SlotMachineState {
  spinning: boolean;
  displaySlots: (Stratagem | null)[];
  slotLocked: boolean[];
  slotJustLocked: boolean[];
}

interface SlotMachineControls extends SlotMachineState {
  /** Kick off the animation for a given set of picked stratagems. */
  startAnimation: (picked: Stratagem[], allStratagems: Stratagem[]) => void;
}

/**
 * Manages all slot-machine animation state.
 * Call `startAnimation` after picking stratagems to begin the spin sequence.
 */
export function useSlotMachine(): SlotMachineControls {
  const [spinning, setSpinning] = useState(false);
  const [displaySlots, setDisplaySlots] = useState<(Stratagem | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [slotLocked, setSlotLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [slotJustLocked, setSlotJustLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  const lockedRef = useRef<boolean[]>([false, false, false, false]);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAnimation = (picked: Stratagem[], allStratagems: Stratagem[]) => {
    if (picked.length === 0) return;

    const slotCount = picked.length;

    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    lockedRef.current = Array(slotCount).fill(false);
    setSlotLocked(Array(slotCount).fill(false));
    setSlotJustLocked(Array(slotCount).fill(false));
    setDisplaySlots(Array(slotCount).fill(null));
    setSpinning(true);

    // Cycle random icons at 80 ms on every unlocked slot
    spinIntervalRef.current = setInterval(() => {
      setDisplaySlots(
        lockedRef.current.map((locked) =>
          locked
            ? null
            : allStratagems[Math.floor(Math.random() * allStratagems.length)],
        ) as (Stratagem | null)[],
      );
    }, 80);

    // Lock slots one by one, staggered
    const lockDelays = [1000, 1500, 2000, 2500].slice(0, slotCount);
    lockDelays.forEach((delay, i) => {
      setTimeout(() => {
        lockedRef.current[i] = true;
        setSlotLocked((prev) => {
          const n = [...prev];
          n[i] = true;
          return n;
        });
        setSlotJustLocked((prev) => {
          const n = [...prev];
          n[i] = true;
          return n;
        });
        // Remove flash after 400 ms
        setTimeout(
          () =>
            setSlotJustLocked((prev) => {
              const n = [...prev];
              n[i] = false;
              return n;
            }),
          400,
        );
      }, delay);
    });

    // Stop interval after the last slot locks
    const lastLock = lockDelays[lockDelays.length - 1];
    setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
      setSpinning(false);
    }, lastLock + 200);
  };

  return {
    spinning,
    displaySlots,
    slotLocked,
    slotJustLocked,
    startAnimation,
  };
}
