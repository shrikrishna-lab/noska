import { useEffect, useState } from "react";

const STAGES = [
  "Loading workspace...",
  "Initializing Noska...",
  "Syncing preferences...",
  "Preparing your space...",
  "Connecting AI...",
];

export function useLoadingStages(onComplete) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete) return;

    // Set variable delays for a more organic feel
    const delays = [800, 700, 600, 800, 500];
    const currentDelay = delays[currentStageIndex] || 600;

    const timer = setTimeout(() => {
      if (currentStageIndex < STAGES.length - 1) {
        setCurrentStageIndex((prev) => prev + 1);
      } else {
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, currentDelay);

    return () => clearTimeout(timer);
  }, [currentStageIndex, isComplete, onComplete]);

  return {
    stageText: STAGES[currentStageIndex],
    stageIndex: currentStageIndex,
    totalStages: STAGES.length,
    isComplete,
  };
}
