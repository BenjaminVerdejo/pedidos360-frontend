import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  MsalGuard,
  MsalInterceptor,
  MsalService,
  MsalBroadcastService,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration
} from '@azure/msal-angular';
import {
  IPublicClientApplication,
  PublicClientApplication,
  InteractionType,
  BrowserCacheLocation
} from '@azure/msal-browser';
import { routes } from './app.routes';
import { ADMIN_API_URL, API_SCOPE, API_URL, CLIENT_ID, TENANT_ID } from './config';

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: CLIENT_ID,
      authority: `https://login.microsoftonline.com/${TENANT_ID}`,
      redirectUri: window.location.origin
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage
    }
  });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  
  // OJO: el interceptor compara la URL completa y exacta. Sin el /* al final
  // NO adjunta el token (por eso daba 401). API_URL es el BFF (puerto 8081).
  protectedResourceMap.set(`${API_URL}/api/*`, [API_SCOPE]);
  // el administrador de RabbitMQ tambien recibe el JWT
  protectedResourceMap.set(`${ADMIN_API_URL}/api/*`, [API_SCOPE]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect, // CORREGIDO: Redirección en lugar de Popup
    authRequest: {
      scopes: [API_SCOPE]
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },
    provideAppInitializer(() => inject(MsalService).initialize()),
    MsalService,
    MsalGuard,
    MsalBroadcastService
  ]
};