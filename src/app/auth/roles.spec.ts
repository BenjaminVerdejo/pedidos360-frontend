import { describe, it, expect } from 'vitest';
import { MsalService } from '@azure/msal-angular';
import { esAdmin, obtenerRoles } from './roles';

function authCon(roles?: string[]): MsalService {
  const cuenta = roles ? { idTokenClaims: { roles } } : null;
  return {
    instance: { getActiveAccount: () => cuenta, getAllAccounts: () => (cuenta ? [cuenta] : []) }
  } as unknown as MsalService;
}

describe('roles (control de acceso en el cliente)', () => {
  it('lee los roles del token de Azure AD', () => {
    expect(obtenerRoles(authCon(['Admin', 'Lector']))).toEqual(['Admin', 'Lector']);
  });

  it('sin sesion no hay roles ni acceso de administrador', () => {
    expect(obtenerRoles(authCon())).toEqual([]);
    expect(esAdmin(authCon())).toBe(false);
  });

  it('solo el rol Admin habilita la administracion', () => {
    expect(esAdmin(authCon(['Admin']))).toBe(true);
    expect(esAdmin(authCon(['Lector']))).toBe(false);
  });
});
