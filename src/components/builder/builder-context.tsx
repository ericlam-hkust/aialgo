import { createContext, useContext, type ReactNode } from "react";

export type BuilderContextValue = {
  issues: Record<string, string>;
  updateParam: (nodeId: string, key: string, value: string) => void;
  removeNode: (nodeId: string) => void;
};

const noop = () => undefined;

const BuilderContext = createContext<BuilderContextValue>({
  issues: {},
  updateParam: noop,
  removeNode: noop,
});

export function BuilderProvider({ value, children }: { value: BuilderContextValue; children: ReactNode }) {
  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export const useBuilder = () => useContext(BuilderContext);
