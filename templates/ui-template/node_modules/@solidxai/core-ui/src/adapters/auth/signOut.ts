import { clearSession } from "./storage";
import { eventBus, AppEvents } from "../../helpers/eventBus";

type SignOutOptions = {
  callbackUrl?: string;
};

export async function signOut(options: SignOutOptions = {}) {
  clearSession();
  eventBus.emit(AppEvents.SessionCleared);
  if (options.callbackUrl && typeof window !== "undefined") {
    window.location.href = options.callbackUrl;
  }
  return;
}
