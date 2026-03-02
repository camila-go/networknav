"use client";

import { useEffect, useState } from "react";
import { X, Flame, Trophy, PartyPopper, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EncouragementMessage } from "@/types";
import { cn } from "@/lib/utils";

interface EncouragementModalProps {
  message: EncouragementMessage;
  onClose: () => void;
  onAction?: () => void;
}

const TYPE_CONFIG: Record<EncouragementMessage["type"], {
  icon: React.ReactNode;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
}> = {
  streak_risk: {
    icon: <Flame className="h-8 w-8" />,
    bgGradient: "from-orange-500/20 to-red-500/10",
    borderColor: "border-orange-500/30",
    iconBg: "bg-gradient-to-br from-orange-500 to-red-500",
  },
  streak_broken: {
    icon: <Flame className="h-8 w-8 opacity-50" />,
    bgGradient: "from-slate-500/20 to-slate-600/10",
    borderColor: "border-slate-500/30",
    iconBg: "bg-slate-600",
  },
  welcome_back: {
    icon: <PartyPopper className="h-8 w-8" />,
    bgGradient: "from-cyan-500/20 to-teal-500/10",
    borderColor: "border-cyan-500/30",
    iconBg: "bg-gradient-to-br from-cyan-500 to-teal-500",
  },
  milestone: {
    icon: <Zap className="h-8 w-8" />,
    bgGradient: "from-violet-500/20 to-purple-500/10",
    borderColor: "border-violet-500/30",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
  },
  badge_earned: {
    icon: <Trophy className="h-8 w-8" />,
    bgGradient: "from-yellow-500/20 to-amber-500/10",
    borderColor: "border-yellow-500/30",
    iconBg: "bg-gradient-to-br from-yellow-500 to-amber-500",
  },
};

export function EncouragementModal({ message, onClose, onAction }: EncouragementModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = TYPE_CONFIG[message.type];

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (message.actionUrl) {
      window.location.href = message.actionUrl;
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-sm rounded-2xl border p-6 text-center transition-all duration-200",
        "bg-gradient-to-b",
        config.bgGradient,
        config.borderColor,
        "bg-[#0a1628]",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}>
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className={cn(
          "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-white",
          config.iconBg
        )}>
          {config.icon}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          {message.title}
        </h2>

        {/* Message */}
        <p className="text-white/70 mb-6">
          {message.message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          {message.actionText && (
            <Button
              onClick={handleAction}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
            >
              {message.actionText}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook to manage encouragement modal display
export function useEncouragementModal() {
  const [message, setMessage] = useState<EncouragementMessage | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const showMessage = (newMessage: EncouragementMessage) => {
    const key = `${newMessage.type}-${newMessage.title}`;
    if (!dismissed.has(key)) {
      setMessage(newMessage);
    }
  };

  const dismissMessage = () => {
    if (message) {
      const key = `${message.type}-${message.title}`;
      setDismissed(prev => new Set(prev).add(key));
    }
    setMessage(null);
  };

  return {
    message,
    showMessage,
    dismissMessage,
  };
}
