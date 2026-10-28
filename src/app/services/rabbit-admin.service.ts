import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ADMIN_API_URL } from '../config';

export type TipoExchange = 'DIRECT' | 'TOPIC' | 'FANOUT' | 'HEADERS';

export interface CrearColaRequest {
  nombre: string;
  durable?: boolean;
  autoDelete?: boolean;
  ttlMs?: number | null;
  maxLength?: number | null;
  deadLetterExchange?: string | null;
  deadLetterRoutingKey?: string | null;
}

export interface ColaResponse {
  nombre: string;
  mensajes: number;
  consumidores: number;
}

export interface CrearExchangeRequest {
  nombre: string;
  tipo: TipoExchange;
  durable?: boolean;
  autoDelete?: boolean;
}

export interface ExchangeResponse extends CrearExchangeRequest {}

export interface BindingRequest {
  exchange: string;
  cola: string;
  routingKey: string;
}

/** Formato de error que devuelve rabbit-admin-service. */
export interface ErrorApi {
  status: number;
  error: string;
  mensaje: string;
  campos?: Record<string, string>;
}

/** Cliente del microservicio administrador de RabbitMQ. El JWT lo agrega el MsalInterceptor. */
@Injectable({ providedIn: 'root' })
export class RabbitAdminService {
  private http = inject(HttpClient);
  private url = `${ADMIN_API_URL}/api/admin`;

  // ---- colas ----
  crearCola(req: CrearColaRequest): Observable<ColaResponse> {
    return this.http.post<ColaResponse>(`${this.url}/queues`, limpiar(req));
  }

  obtenerCola(nombre: string): Observable<ColaResponse> {
    return this.http.get<ColaResponse>(`${this.url}/queues/${encodeURIComponent(nombre)}`);
  }

  eliminarCola(nombre: string, soloSiVacia = false): Observable<void> {
    const params = new HttpParams().set('soloSiVacia', soloSiVacia);
    return this.http.delete<void>(`${this.url}/queues/${encodeURIComponent(nombre)}`, { params });
  }

  // ---- exchanges ----
  crearExchange(req: CrearExchangeRequest): Observable<ExchangeResponse> {
    return this.http.post<ExchangeResponse>(`${this.url}/exchanges`, req);
  }

  eliminarExchange(nombre: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/exchanges/${encodeURIComponent(nombre)}`);
  }

  // ---- bindings ----
  crearBinding(req: BindingRequest): Observable<BindingRequest> {
    return this.http.post<BindingRequest>(`${this.url}/bindings`, req);
  }

  eliminarBinding(req: BindingRequest): Observable<void> {
    const params = new HttpParams()
      .set('exchange', req.exchange)
      .set('cola', req.cola)
      .set('routingKey', req.routingKey);
    return this.http.delete<void>(`${this.url}/bindings`, { params });
  }
}

/** Convierte la respuesta de error del backend en un texto legible. */
export function mensajeDeError(err: HttpErrorResponse): string {
  if (err.status === 0) return 'No se pudo conectar con rabbit-admin-service (puerto 8082)';
  if (err.status === 401) return 'Sesion vencida: vuelve a iniciar sesion';
  if (err.status === 403) return 'No tienes permisos: se requiere el rol Admin';
  const body = err.error as ErrorApi | null;
  if (body?.campos && Object.keys(body.campos).length) {
    return Object.entries(body.campos).map(([campo, msg]) => `${campo}: ${msg}`).join(' | ');
  }
  return body?.mensaje ?? `Error ${err.status}`;
}

/** No envia campos opcionales vacios (null / '') al backend. */
function limpiar<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ) as Partial<T>;
}
