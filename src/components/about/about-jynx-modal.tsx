"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, MessageCircle, ExternalLink } from "lucide-react";

interface AboutJynxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const teamMembers = [
  {
    name: "Camila Gonzalez",
    title: "UI/UX Designer",
  },
  {
    name: "Austin Potter",
    title: "Artificial Intelligence Innovation Developer",
  },
  {
    name: "Lisa Lucas",
    title: "Senior Designer",
  },
];

function TeamMemberCard({ name, title }: { name: string; title: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#444] rounded-2xl overflow-hidden flex flex-col">
      <div className="pt-8 pb-4 flex flex-col items-center gap-3">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#141e21]" />
        <div className="text-center px-4">
          <h3 className="text-lg sm:text-xl font-bold text-white">{name}</h3>
          <p className="text-sm text-white/70 mt-1">{title}</p>
        </div>
      </div>
      <div className="bg-[#191919] px-4 py-4 flex gap-3 justify-center">
        <button className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-[#343434] text-white text-sm font-medium hover:bg-white/5 transition-colors">
          View Profile
        </button>
        <button className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#29606f] text-white text-sm font-medium hover:bg-[#347a8c] transition-colors">
          <MessageCircle className="w-4 h-4" />
          Chat
          <ExternalLink className="w-3 h-3 opacity-80" />
        </button>
      </div>
    </div>
  );
}

export function AboutJynxModal({ open, onOpenChange }: AboutJynxModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black border-white/10 p-0">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 rounded-sm text-white/50 hover:text-white transition-opacity focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </button>

        <div className="px-6 sm:px-12 py-10 space-y-12">
          {/* About Section */}
          <section className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-3xl sm:text-4xl font-bold text-white">
                About Jynx
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 text-white/80 text-base sm:text-lg leading-relaxed">
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
          <section className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">
              The Team
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <TeamMemberCard
                  key={member.name}
                  name={member.name}
                  title={member.title}
                />
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
