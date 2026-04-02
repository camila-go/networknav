"use client";

import Image from "next/image";
import { X, ExternalLink } from "lucide-react";
import { cn, teamsChartUrl } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  logExplorePassClick,
  logTeamsChatClick,
  type NetworkActionSource,
} from "@/lib/log-network-action";

const tabIconClass = "h-4 w-4 shrink-0";
const TAB_STROKE = 2.75;

export interface TeamsActionButtonsProps {
  targetEmail: string;
  targetName: string;
  targetUserId: string;
  source: NetworkActionSource;
  onPass?: () => void;
  /** When false, Pass is hidden (e.g. viewing own post). Default true when onPass provided. */
  showPass?: boolean;
  /**
   * First line suggested for the chat; passed to Teams as the deep-link `message` param
   * so it can appear in the compose box (user sends manually; not all clients support it).
   */
  composeMessage?: string;
  className?: string;
}

/**
 * Secondary Pass (outline) · primary Chat (default). Chat opens Teams 1:1 in a new tab.
 */
export function TeamsActionButtons({
  targetEmail,
  targetName,
  targetUserId,
  source,
  onPass,
  showPass = Boolean(onPass),
  composeMessage,
  className,
}: TeamsActionButtonsProps) {
  const chatUrl = teamsChartUrl(targetEmail, { composeMessage });
  const hasPass = Boolean(showPass && onPass);

  const handlePass = () => {
    logExplorePassClick({ source, targetUserId });
    onPass?.();
  };

  const chatAriaLabel = composeMessage?.trim()
    ? `Chat with ${targetName} in Microsoft Teams; a suggested opening line may appear in the message field (opens in new tab)`
    : `Chat with ${targetName} in Microsoft Teams (opens in new tab)`;

  return (
    <div className={cn("flex w-full flex-wrap items-stretch gap-3", className)}>
      {hasPass && (
        <button
          type="button"
          onClick={handlePass}
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "flex-1 basis-0 min-w-[min(100%,9rem)] gap-2 border-white/25 text-white/90 hover:text-white"
          )}
        >
          <span>Pass</span>
          <X className="h-4 w-4 opacity-80 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      )}
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={
          composeMessage?.trim()
            ? "Opens Teams with the first conversation starter in the compose field when supported"
            : undefined
        }
        aria-label={chatAriaLabel}
        onClick={() =>
          logTeamsChatClick({
            source,
            targetUserId,
            targetEmail,
          })
        }
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          "no-underline gap-2",
          hasPass ? "flex-1 basis-0 min-w-[min(100%,9rem)]" : "w-full"
        )}
      >
        <Image
          src="/teams-icon.png"
          alt=""
          width={18}
          height={18}
          className="shrink-0"
          aria-hidden
        />
        <span>Chat</span>
        <ExternalLink
          className={cn(tabIconClass, "text-black/65")}
          strokeWidth={TAB_STROKE}
          aria-hidden
        />
      </a>
    </div>
  );
}
