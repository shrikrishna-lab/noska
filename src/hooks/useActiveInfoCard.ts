import { useState, useEffect } from "react";
import { infoCardService, type InfoCardRecord } from "@/lib/infoCardService";

export function useActiveInfoCard(platform: "desktop" | "web" = "desktop") {
  const [activeCard, setActiveCard] = useState<InfoCardRecord | null>(() =>
    infoCardService.getActiveCard(platform)
  );

  useEffect(() => {
    const unsubscribe = infoCardService.subscribe(() => {
      setActiveCard(infoCardService.getActiveCard(platform));
    });
    return unsubscribe;
  }, [platform]);

  const handleDismiss = () => {
    if (activeCard) {
      infoCardService.trackDismiss(activeCard.id);
      setActiveCard(null);
    }
  };

  const handleClick = () => {
    if (activeCard) {
      infoCardService.trackClick(activeCard.id);
    }
  };

  return {
    activeCard,
    handleDismiss,
    handleClick,
  };
}
