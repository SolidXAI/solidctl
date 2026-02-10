// rolesHelper.ts in your NPM package
export function hasAnyRole(userRoles: string[] | undefined, rolesToCheck: string[]) {
  return !!userRoles && rolesToCheck.some(role => userRoles.includes(role));
}
