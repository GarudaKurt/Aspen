import type { CSSProperties } from "react";

export const colors = {
  primary: "#3c6355",
  defaultText: "#2c2c2c",
} as const;

export const colorVariables = {
  "--color-primary": colors.primary,
  "--color-default-text": colors.defaultText,
} as CSSProperties;
