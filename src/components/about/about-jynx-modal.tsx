"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, MessageCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface AboutJynxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const teamMembers = [
  {
    id: "team-camila-gonzalez",
    name: "Camila Gonzalez",
    title: "UI/UX Designer",
  },
  {
    id: "team-austin-potter",
    name: "Austin Potter",
    title: "Artificial Intelligence Innovation Developer",
  },
  {
    id: "team-lisa-lucas",
    name: "Lisa Lucas",
    title: "Senior Designer",
  },
];

function TeamMemberCard({ 
  id,
  name, 
  title,
  onViewProfile,
  onChat,
}: { 
  id: string;
  name: string; 
  title: string;
  onViewProfile: () => void;
  onChat: () => void;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#444] rounded-2xl overflow-hidden flex flex-col min-w-0">
      <div className="pt-10 pb-6 flex flex-col items-center gap-4">
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-[#141e21] shrink-0" />
        <div className="text-center px-4">
          <h3 className="text-xl md:text-2xl font-bold text-white">{name}</h3>
          <p className="text-sm md:text-base text-white/70 mt-1">{title}</p>
        </div>
      </div>
      <div className="bg-[#191919] px-4 py-5 flex flex-wrap gap-3 justify-center">
        <button 
          onClick={onViewProfile}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border border-[#343434] text-white text-sm font-semibold hover:bg-white/5 transition-colors"
        >
          View Profile
        </button>
        <button 
          onClick={onChat}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#29606f] text-white text-sm font-semibold hover:bg-[#347a8c] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Chat
          <ExternalLink className="w-3 h-3 opacity-80" />
        </button>
      </div>
    </div>
  );
}

export function AboutJynxModal({ open, onOpenChange }: AboutJynxModalProps) {
  const router = useRouter();

  const handleViewProfile = (id: string) => {
    onOpenChange(false);
    setTimeout(() => {
      router.push(`/user/${id}`);
    }, 100);
  };

  const handleChat = (id: string, name: string) => {
    onOpenChange(false);
    setTimeout(() => {
      router.push(`/messages?new=${id}&name=${encodeURIComponent(name)}`);
    }, 100);
  };

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
          {/* Close button */}
          <DialogPrimitive.Close 
            className="absolute right-5 top-5 z-10 text-white/50 hover:text-white transition-colors focus:outline-none"
          >
            <X className="h-8 w-8" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-10 md:px-12 md:py-14">
            <div className="space-y-14 max-w-4xl mx-auto">
              {/* About Section */}
              <section className="space-y-6">
                <DialogPrimitive.Title className="text-3xl md:text-5xl font-bold text-white">
                  About Jynx
                </DialogPrimitive.Title>
                <div className="space-y-6 text-white/80 text-base md:text-xl leading-relaxed">
                  <p>
                    It started as a seed of an idea: a way to help leaders build meaningful 
                    connections tailored to their interests. So we built it ourselves, drawing 
                    on the needs of our community and the insights of the people it&apos;s designed 
                    to serve. The result is a networking experience shaped from within, designed 
                    to strengthen relationships, spark new ideas and help every leader get more 
                    from every interaction.
                  </p>
                  <p>
                    This work began as a pie-in-the-sky idea for the CAPS team working on 
                    Global Summit 2026; the application took shape through a combination of 
                    product design and AI, with a stretch assignment providing coding support, 
                    validation and refinement. Special thanks to Camila Gonzalez, Austin Potter 
                    and Lisa Lucas, whose creativity and drive helped turn the idea into reality.
                  </p>
                </div>
              </section>

              {/* Team Section */}
              <section className="space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold text-white text-center">
                  The Team
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {teamMembers.map((member) => (
                    <TeamMemberCard
                      key={member.id}
                      id={member.id}
                      name={member.name}
                      title={member.title}
                      onViewProfile={() => handleViewProfile(member.id)}
                      onChat={() => handleChat(member.id, member.name)}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
