import { toast } from "sonner";
import { cleanUpgradeMessage, isUpgradeError } from "./entitlements";

export const UPGRADE_EVENT = "aialgo:upgrade-required";

/**
 * Shows an upgrade dialog when the server rejected an action for plan reasons,
 * otherwise falls back to a plain error toast. Returns true when it was a gate.
 */
export function handleActionError(error: unknown, fallback = "Something went wrong"): boolean {
  const message = error instanceof Error ? error.message : "";
  if (isUpgradeError(message)) {
    window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: cleanUpgradeMessage(message) }));
    return true;
  }
  toast.error(message || fallback);
  return false;
}
