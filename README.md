# Pedidos360 - Frontend

[![CI Seguridad y Calidad](https://github.com/BenjaminVerdejo/pedidos360-frontend/actions/workflows/ci-seguridad.yml/badge.svg)](https://github.com/BenjaminVerdejo/pedidos360-frontend/actions/workflows/ci-seguridad.yml)
[![CodeQL](https://github.com/BenjaminVerdejo/pedidos360-frontend/actions/workflows/codeql.yml/badge.svg)](https://github.com/BenjaminVerdejo/pedidos360-frontend/actions/workflows/codeql.yml)

Frontend Angular 22 (componentes standalone + signals) de Pedidos360.
Inicia sesión con **Azure AD (IDaaS)** usando MSAL y envía el **JWT** en cada llamada al backend.

Backend: https://github.com/BenjaminVerdejo/pedidos360-backend

## Pantallas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Bienvenida, login y prueba de conexión segura con el backend (`/api/test`) |
| `/pedidos` | Sesión iniciada (`MsalGuard`) | Crear, listar y cambiar el estado de pedidos; eliminar solo para el rol Admin. Al crear o cambiar el estado, el backend publica un evento en RabbitMQ (notificación + ticket) |
| `/admin-rabbitmq` | Rol **Admin** (`MsalGuard` + `adminGuard`) | Crear y eliminar colas, exchanges y bindings mediante `rabbit-admin-service` |

## Seguridad (IDaaS + JWT)

- `app.config.ts`: `MsalInterceptor` adjunta el access token (scope `Pedidos.Access`) a toda llamada a
  `API_URL/api/*` (BFF, puerto 8081) y `ADMIN_API_URL/api/*` (rabbit-admin-service, puerto 8082).
- `MsalGuard` protege las rutas privadas; `auth/roles.ts` lee el claim `roles` para el rol Admin.
- El backend vuelve a validar el token y los permisos (401 / 403).

## Estructura

```
src/app/
  config.ts                     URLs de los servicios y datos de Azure AD
  app.config.ts                 MSAL: instancia, guard e interceptor
  app.routes.ts                 rutas (la de administración se carga de forma diferida)
  auth/roles.ts                 lectura de roles + adminGuard
  services/pedidos.service.ts   cliente del BFF
  services/rabbit-admin.service.ts  cliente de rabbit-admin-service
  inicio/  pedidos/  rabbit-admin/  vistas
```

## Ejecutar

```bash
npm install
npm start          # http://localhost:4200  (requiere los microservicios del backend corriendo)
npm test           # pruebas unitarias (Vitest)
npm run test:ci    # pruebas + reporte de cobertura (coverage/)
npm run audit:seguridad   # falla si hay dependencias con vulnerabilidades HIGH/CRITICAL
npm run build      # compilación de producción en dist/
docker build -t pedidos360/frontend . && docker run -p 8080:8080 pedidos360/frontend   # nginx sin root + cabeceras de seguridad
```

## Seguridad y calidad (EP5)

| Control | Implementación |
|---|---|
| Token fuera de almacenamiento persistente | MSAL con `sessionStorage` (antes `localStorage`) |
| Content-Security-Policy | `index.html` (meta) y cabecera HTTP en `nginx.conf`; sin scripts *inline* (`inlineCritical: false`) |
| Cabeceras HTTP | `nginx.conf`: CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS, `server_tokens off` |
| Validación de entrada | `pedidos/validacion.ts` con los mismos límites que el backend; mensajes de error sin detalles técnicos |
| Reglas de negocio en la UI | Pedidos ENTREGADO/CANCELADO no muestran acciones de cambio de estado |
| Dependencias | `npm audit` sin vulnerabilidades + Dependabot semanal |

Pipeline [`ci-seguridad.yml`](.github/workflows/ci-seguridad.yml): pruebas + cobertura (Vitest), SCA (npm audit + Trivy),
SAST (Semgrep con reglas propias en [`.semgrep/`](.semgrep) + CodeQL), secretos (Gitleaks), Hadolint, Trivy imagen,
verificación de cabeceras ([`scripts/verificar-cabeceras.sh`](scripts/verificar-cabeceras.sh)) y OWASP ZAP.
