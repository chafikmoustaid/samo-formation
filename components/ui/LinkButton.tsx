import Link from "next/link";
import { buttonClasses, ButtonVariant, ButtonSize } from "@/lib/buttonStyles";

export default function LinkButton({
  href,
  variant,
  size,
  className,
  children,
  target,
  rel,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={buttonClasses(variant, size, className)}
    >
      {children}
    </Link>
  );
}
