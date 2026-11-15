import { jsxDEV as original, Fragment } from "react/jsx-dev-runtime";
import { localizedProps } from "./jsx-runtime";
export { Fragment };
export type { JSX } from "react/jsx-dev-runtime";
export const jsxDEV: typeof original = (
  type,
  props,
  key,
  isStatic,
  source,
  self,
) => original(type, localizedProps(type, props), key, isStatic, source, self);
