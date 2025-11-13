const protectedRoutes = ["/learning", "/profile", "/admin", "/users"];
const unprotectedRoutes = ["/login", "/signup"];

export function isInProtectedRoutes(): boolean {
  const path = window.location.pathname;
  return path !== "/" && unprotectedRoutes.every(route => !path.startsWith(route));
}


export { protectedRoutes };
