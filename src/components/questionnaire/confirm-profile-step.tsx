"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";

interface ConfirmProfileStepProps {
  profileData: { name: string; title: string; company: string };
  onConfirm: (updated: { name: string; title: string; company: string }) => void;
  disabled?: boolean;
}

export function ConfirmProfileStep({
  profileData,
  onConfirm,
  disabled,
}: ConfirmProfileStepProps) {
  const [name, setName] = useState(profileData.name);
  const [title, setTitle] = useState(profileData.title);
  const [company, setCompany] = useState(profileData.company);

  const canConfirm = name.trim().length >= 2 && title.trim().length >= 2;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="confirm-name" className="text-xs text-zinc-400">
            Name
          </Label>
          <Input
            id="confirm-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-title" className="text-xs text-zinc-400">
            Title
          </Label>
          <Input
            id="confirm-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-company" className="text-xs text-zinc-400">
            Company
          </Label>
          <Input
            id="confirm-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={disabled}
            placeholder="Optional"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 h-9 text-sm"
          />
        </div>
      </div>

      <Button
        onClick={() =>
          onConfirm({
            name: name.trim(),
            title: title.trim(),
            company: company.trim(),
          })
        }
        disabled={disabled || !canConfirm}
        className="gap-2 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-white"
      >
        {disabled ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Looks Good
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
