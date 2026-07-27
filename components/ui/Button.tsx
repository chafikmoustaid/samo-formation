"use client";

import { ButtonHTMLAttributes } from "react";
import { buttonClasses, ButtonVariant, ButtonSize } from "@/lib/buttonStyles";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function Button({
  variant,
  size,
  className,
  ...rest
}: Props) {
  return <button className={buttonClasses(variant, size, className)} {...rest} />;
}
