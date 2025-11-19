import type { LOCATION } from "svelte-routing";
import type { getLocation } from "svelte-routing/src/history";

const protectedRoutes = ["/learning", "/profile", "/admin", "/users"];
const unprotectedRoutes = ["/login", "/signup"];
const routesWithoutSidebar = ["/client-orders-v2", "/client-orders-v3"];

export function isInProtectedRoutes(location: LOCATION | null): boolean {
  if (!location || !location.pathname) return false;
  const path = location.pathname;
  return path !== "/" && unprotectedRoutes.every(route => !path.startsWith(route));
}

export function shouldShowSidebar(location: LOCATION | null): boolean {
  if (!location || !location.pathname) return true;
  const path = location.pathname;
  return !routesWithoutSidebar.some(route => path.startsWith(route));
}

export { protectedRoutes };
