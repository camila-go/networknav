import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Gs26LockupLinkProps = {
  className?: string;
  /** Default `/` for marketing; use `/dashboard` in the authenticated shell. */
  href?: string;
};

/**
 * JYNX GS26 lockup logo
 */
export function Gs26LockupLink({ className, href = "/" }: Gs26LockupLinkProps) {
  return (
    <Link
      href={href}
      aria-label="JYNX GS26 home"
      className={cn(
        "flex items-center",
        className,
      )}
    >
      <Image
        src="/lockup-jynx.svg"
        alt="JYNX GS26"
        width={160}
        height={37}
        className="h-8 w-auto sm:h-10"
        priority
      />
    </Link>
  );
}
