"use client";

import { X, ExternalLink } from "lucide-react";
import { cn, teamsChartUrl, teamsMeetingUrl } from "@/lib/utils";
import {
  logExplorePassClick,
  logTeamsChatClick,
  logTeamsMeetClick,
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
  className?: string;
}

/**
 * Pass (text) · Chat (outline) · Meet (primary). Chat/Meet use one external-link icon only (new tab).
 */
export function TeamsActionButtons({
  targetEmail,
  targetName,
  targetUserId,
  source,
  onPass,
  showPass = Boolean(onPass),
  className,
}: TeamsActionButtonsProps) {
  const chatUrl = teamsChartUrl(targetEmail);
  const meetUrl = teamsMeetingUrl(targetEmail, `Meet with ${targetName}`);

  const handlePass = () => {
    logExplorePassClick({ source, targetUserId });
    onPass?.();
  };

  const linkBase =
    "inline-flex flex-1 min-w-[7rem] items-center justify-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium transition-colors";

  return (
    <div className={cn("flex flex-wrap items-stretch gap-2", className)}>
      {showPass && onPass && (
        <button
          type="button"
          onClick={handlePass}
          className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors order-1 sm:order-none"
        >
          <span>Pass</span>
          <X className="h-4 w-4 opacity-70 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      )}
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${targetName} in Microsoft Teams (opens in new tab)`}
        onClick={() =>
          logTeamsChatClick({
            source,
            targetUserId,
            targetEmail,
          })
        }
        className={cn(
          linkBase,
          "text-white border border-white/25 bg-white/[0.06] hover:bg-white/10 hover:border-white/40"
        )}
      >
        <span>Chat</span>
        <ExternalLink
          className={cn(tabIconClass, "text-white/85")}
          strokeWidth={TAB_STROKE}
          aria-hidden
        />
      </a>
      <a
        href={meetUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Schedule a Teams meeting with ${targetName} (opens in new tab)`}
        onClick={() =>
          logTeamsMeetClick({
            source,
            targetUserId,
            targetEmail,
          })
        }
        className={cn(
          linkBase,
          "font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 text-black border-0 shadow-md shadow-cyan-500/20",
          "hover:from-cyan-400 hover:to-teal-400"
        )}
      >
        <span>Meet</span>
        <ExternalLink className={cn(tabIconClass, "text-black")} strokeWidth={TAB_STROKE} aria-hidden />
      </a>
    </div>
  );
}
