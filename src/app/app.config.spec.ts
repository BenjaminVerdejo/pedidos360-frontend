import { describe, it, expect } from 'vitest';
import { InteractionType } from '@azure/msal-browser';
import { MSALGuardConfigFactory, MSALInterceptorConfigFactory } from './app.config';
import { ADMIN_API_URL, ANALITICA_API_URL, API_SCOPE, API_URL, KAFKA_ADMIN_API_URL } from './config';

describe('configuracion de seguridad MSAL', () => {
  it('el interceptor adjunta el JWT solo a las APIs propias', () => {
    const mapa = MSALInterceptorConfigFactory().protectedResourceMap as Map<string, string[]>;
    expect(mapa.get(`${API_URL}/api/*`)).toEqual([API_SCOPE]);
    expect(mapa.get(`${ADMIN_API_URL}/api/*`)).toEqual([API_SCOPE]);
    expect(mapa.get(`${ANALITICA_API_URL}/api/*`)).toEqual([API_SCOPE]);
    expect(mapa.get(`${KAFKA_ADMIN_API_URL}/api/*`)).toEqual([API_SCOPE]);
    expect(mapa.size).toBe(4);
  });

  it('el guard exige el scope Pedidos.Access con redireccion', () => {
    const guard = MSALGuardConfigFactory();
    expect(guard.interactionType).toBe(InteractionType.Redirect);
    expect(guard.authRequest).toEqual({ scopes: [API_SCOPE] });
  });
});
