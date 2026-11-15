import {
  jsx as originalJsx,
  jsxs as originalJsxs,
  Fragment,
} from "react/jsx-runtime";
import { translateText } from "./core";
import type { ReactNode } from "react";
export { Fragment };
export type { JSX } from "react/jsx-runtime";
function content(value: ReactNode): ReactNode {
  if (typeof value === "string") return translateText(value);
  if (Array.isArray(value)) return value.map(content);
  return value;
}
export function localizedProps(type: unknown, props: unknown) {
  if (
    (typeof type !== "string" && type !== Fragment) ||
    !props ||
    typeof props !== "object"
  )
    return props;
  const source = props as Record<string, unknown>;
  if (source["data-i18n"] === "off") return props;
  const next = { ...source };
  for (const key of [
    "aria-label",
    "aria-description",
    "aria-valuetext",
    "aria-roledescription",
    "aria-placeholder",
    "label",
    "title",
    "alt",
    "placeholder",
  ])
    if (typeof next[key] === "string")
      next[key] = translateText(next[key] as string);
  if (
    type === "option" &&
    next.value === undefined &&
    typeof next.children === "string"
  )
    next.value = next.children;
  if (type !== "textarea" && type !== "script" && type !== "style")
    next.children = content(next.children as ReactNode);
  return next;
}
export const jsx: typeof originalJsx = (type, props, key) =>
  originalJsx(type, localizedProps(type, props), key);
export const jsxs: typeof originalJsxs = (type, props, key) =>
  originalJsxs(type, localizedProps(type, props), key);
