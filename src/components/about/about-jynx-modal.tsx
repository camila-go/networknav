"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Image from "next/image";
import { X, MessageCircle, ExternalLink } from "lucide-react";
import { cn, teamsChartUrl } from "@/lib/utils";
import Link from "next/link";

interface AboutJynxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TeamMember = {
  id: string;
  name: string;
  title: string;
  photoUrl: string | null;
  email: string | null;
  placeholder?: boolean;
};

function TeamMemberCard({
  id,
  name,
  title,
  photoUrl,
  email,
  placeholder,
}: TeamMember) {
  const profileHref = `/user/${encodeURIComponent(id)}`;
  const messagesHref = `/messages?userId=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
  const teamsHref = email ? teamsChartUrl(email) : null;

  return (
    <div className="bg-[#0d0d0d] border border-[#444] rounded-2xl overflow-hidden flex flex-col min-w-0">
      <div className="pt-10 pb-6 flex flex-col items-center gap-4">
        <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-[#141e21] shrink-0 overflow-hidden">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 7rem, 9rem"
            />
          ) : null}
        </div>
        <div className="text-center px-4">
          <h3 className="text-xl md:text-2xl font-bold text-white">{name}</h3>
          <p className="text-sm md:text-base text-white/70 mt-1">{title}</p>
        </div>
      </div>
      <div className="bg-[#191919] px-4 py-5 flex flex-wrap gap-3 justify-center">
        <Link
          href={profileHref}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border border-[#343434] text-white text-sm font-semibold hover:bg-white/5 transition-colors"
        >
          View Profile
        </Link>
        {teamsHref ? (
          <a
            href={teamsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#29606f] text-white text-sm font-semibold hover:bg-[#347a8c] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        ) : placeholder ? (
          <span
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border border-white/20 text-white/45 text-sm font-semibold cursor-not-allowed"
            title="Profile not on the network yet"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </span>
        ) : (
          <Link
            href={messagesHref}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#29606f] text-white text-sm font-semibold hover:bg-[#347a8c] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
            <ExternalLink className="w-3 h-3 opacity-80" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function AboutJynxModal({ open, onOpenChange }: AboutJynxModalProps) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/team", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { members: TeamMember[] } }) => {
        if (cancelled) return;
        if (body.success && Array.isArray(body.data?.members)) {
          setMembers(body.data!.members);
        } else {
          setMembers([]);
        }
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-4 z-50 mx-auto my-auto flex flex-col bg-black border border-white/10 rounded-xl shadow-2xl",
            "max-w-5xl max-h-[calc(100vh-2rem)] md:inset-8 md:max-h-[calc(100vh-4rem)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <DialogPrimitive.Close className="absolute right-5 top-5 z-10 text-white/50 hover:text-white transition-colors focus:outline-none">
            <X className="h-8 w-8" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex-1 overflow-y-auto px-6 py-10 md:px-12 md:py-14">
            <div className="space-y-14 max-w-4xl mx-auto">
              <section className="space-y-6">
                <DialogPrimitive.Title className="text-3xl md:text-5xl font-bold text-white">
                  About Jynx
                </DialogPrimitive.Title>
                <div className="space-y-6 text-white/80 text-base md:text-xl leading-relaxed">
                  <p>
                    It started as a seed of an idea: a way to help leaders build
                    meaningful connections tailored to their interests. So we
                    built it ourselves, drawing on the needs of our community and
                    the insights of the people it&apos;s designed to serve. The
                    result is a networking experience shaped from within, designed
                    to strengthen relationships, spark new ideas and help every
                    leader get more from every interaction.
                  </p>
                  <p>
                    This work began as a pie-in-the-sky idea for the CAPS team
                    working on Global Summit 2026; the application took shape
                    through a combination of product design and AI, with a stretch
                    assignment providing coding support, validation and refinement.
                    Special thanks to Camila Gonzalez, Austin Potter and Lisa
                    Lucas, whose creativity and drive helped turn the idea into
                    reality.
                  </p>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold text-white text-center">
                  The Team
                </h2>
                {members === null ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-80 rounded-2xl bg-white/5 animate-pulse border border-white/10"
                      />
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-center text-white/50 text-sm">
                    Could not load team profiles. Try again later.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {members.map((member) => (
                      <TeamMemberCard key={member.id} {...member} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
