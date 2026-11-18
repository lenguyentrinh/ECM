import { createContext } from "react";

/** True while rendering inside a persistent role shell (see `RoleShellRoute`), so nested layouts don't render a second one. */
export const ShellContext = createContext(false);
