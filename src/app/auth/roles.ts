import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

/** Roles de Azure AD (claim "roles") de la cuenta con sesion iniciada. */
export function obtenerRoles(auth: MsalService): string[] {
  const instance = auth.instance;
  const cuenta = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
  const claims = cuenta?.idTokenClaims as { roles?: string[] } | undefined;
  return claims?.roles ?? [];
}

export function esAdmin(auth: MsalService): boolean {
  return obtenerRoles(auth).includes('Admin');
}

/** Protege rutas que solo puede ver el rol Admin (el backend igual lo valida). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(MsalService);
  return esAdmin(auth) ? true : inject(Router).createUrlTree(['/']);
};
