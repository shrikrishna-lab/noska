import React, { useEffect } from "react";
import {
  InfoCard,
  InfoCardContent,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardMedia,
  InfoCardFooter,
  InfoCardDismiss,
  InfoCardAction,
} from "@/components/ui/info-card";
import { PromoTicketCard } from "@/components/ui/promo-ticket-card";
import { DynamicCapsuleCard } from "@/components/ui/dynamic-capsule-card";
import { BonusWalletCard } from "@/components/ui/bonus-wallet-card";
import { useActiveInfoCard } from "@/hooks/useActiveInfoCard";
import { infoCardService } from "@/lib/infoCardService";
import { ExternalLink } from "lucide-react";

export function UserSidebarInfoCard({ className }: { className?: string }) {
  const { activeCard, handleDismiss, handleClick } = useActiveInfoCard();

  useEffect(() => {
    if (activeCard?.id) {
      infoCardService.trackImpression(activeCard.id);
    }
  }, [activeCard?.id]);

  if (!activeCard) return null;

  const isClaimed = infoCardService.isCardClaimed(activeCard.id, activeCard.storage_key);

  const handleClaimBonus = () => {
    infoCardService.trackClaim(activeCard.id);
  };

  // 1. Promotional Ticket Voucher Style (Image 1)
  if (activeCard.card_style === "ticket_voucher") {
    return (
      <div className={`w-full max-w-full overflow-hidden ${className || ""}`}>
        <PromoTicketCard
          key={activeCard.id}
          id={activeCard.id}
          tag={activeCard.voucher_tag || "DISCOUNT"}
          bonusValue={activeCard.bonus_value || "32%"}
          title={activeCard.title}
          description={activeCard.description}
          termsText={activeCard.terms_text}
          promoCode={activeCard.promo_code || "NOSKA32"}
          barcodeNumber={activeCard.barcode_number || "1234567890"}
          themeColor={activeCard.theme_color || "cyan"}
          actionLabel={activeCard.action_label || "CLAIM"}
          actionUrl={activeCard.action_url || "/pricing"}
          viewUrl={activeCard.action_url || "/pricing"}
          isClaimed={isClaimed}
          onClaim={handleClaimBonus}
          onDismiss={handleDismiss}
        />
      </div>
    );
  }

  // 2. Dynamic Island / Flight Status Capsule Style (Image 2)
  if (activeCard.card_style === "dynamic_capsule") {
    return (
      <div className={`w-full max-w-full overflow-hidden ${className || ""}`}>
        <DynamicCapsuleCard
          key={activeCard.id}
          id={activeCard.id}
          routeFrom={activeCard.route_from || "YYZ"}
          routeTo={activeCard.route_to || "HND"}
          routeFromLabel={activeCard.route_from_label || "Toronto"}
          routeToLabel={activeCard.route_to_label || "Tokyo"}
          etaLabel={activeCard.eta_label || "ETA 2:15 PM"}
          timerLabel={activeCard.timer_label || "DINNER IN 2:34H"}
          sliderLabel={activeCard.slider_label || "-7H 01M"}
          accentGlow={activeCard.accent_glow || "lime"}
          actionUrl={activeCard.action_url || "/dashboard"}
          isClaimed={isClaimed}
          onClaim={handleClaimBonus}
          onDismiss={handleDismiss}
        />
      </div>
    );
  }

  // 3. Apple Balance & Rewards Wallet Style (Image 3)
  if (activeCard.card_style === "wallet_balance") {
    return (
      <div className={`w-full max-w-full overflow-hidden ${className || ""}`}>
        <BonusWalletCard
          key={activeCard.id}
          id={activeCard.id}
          balanceTitle={activeCard.wallet_title || "YOUR BALANCE"}
          balanceAmount={activeCard.wallet_balance || "$52,002.50"}
          recentActivityTitle={activeCard.recent_activity_title || "Dribbble Pro"}
          recentActivityDate={activeCard.recent_activity_date || "Jan 17 • 20:12"}
          recentActivityAmount={activeCard.recent_activity_amount || "$60.00"}
          actionLabel={activeCard.action_label || "Receive"}
          actionUrl={activeCard.action_url || "/dashboard"}
          isClaimed={isClaimed}
          onClaim={handleClaimBonus}
          onDismiss={handleDismiss}
        />
      </div>
    );
  }

  // 4. Standard Announcement / Media Card (Default)
  return (
    <div className={`w-full max-w-full overflow-hidden ${className || ""}`}>
      <InfoCard
        key={activeCard.id}
        storageKey={activeCard.storage_key}
        dismissType={activeCard.dismiss_type}
        className="border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#181A20] p-3.5 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-2xl"
      >
        <InfoCardContent>
          <InfoCardTitle className="text-xs font-normal text-[#9CA3AF] dark:text-[#9CA3AF]/90 mb-1">
            {activeCard.title}
          </InfoCardTitle>

          <InfoCardDescription className="text-[14px] font-medium text-[#374151] dark:text-[#E5E7EB] leading-tight mb-2">
            {activeCard.description}
          </InfoCardDescription>

          {activeCard.media && activeCard.media.length > 0 && (
            <InfoCardMedia
              media={activeCard.media}
              shrinkHeight={85}
              expandHeight={145}
            />
          )}

          <InfoCardFooter className="mt-0">
            <InfoCardDismiss
              onDismiss={handleDismiss}
              className="text-xs font-normal text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer select-none"
            >
              Dismiss
            </InfoCardDismiss>

            {activeCard.action_label && (
              <InfoCardAction>
                <a
                  href={activeCard.action_url || "#"}
                  onClick={handleClick}
                  className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground/80 hover:text-foreground underline transition-colors select-none cursor-pointer"
                >
                  {activeCard.action_label}
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              </InfoCardAction>
            )}
          </InfoCardFooter>
        </InfoCardContent>
      </InfoCard>
    </div>
  );
}

export default UserSidebarInfoCard;
