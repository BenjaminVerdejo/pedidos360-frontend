import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KAFKA_ADMIN_API_URL } from '../config';

export type CleanupPolicy = 'delete' | 'compact';

export interface ParticionInfo {
  particion: number;
  lider: number | null;
  replicas: number[];
  isr: number[];
}

export interface TopicoResponse {
  nombre: string;
  particiones: number;
  replicas: number;
  protegido: boolean;
  configuracion: Record<string, string>;
  detalleParticiones: ParticionInfo[];
}

export interface CrearTopicoRequest {
  nombre: string;
  particiones: number;
  replicas: number;
  retencionMs?: number | null;
  cleanupPolicy?: CleanupPolicy | null;
  minInsyncReplicas?: number | null;
}

export interface ActualizarConfigRequest {
  retencionMs?: number | null;
  cleanupPolicy?: CleanupPolicy | null;
  minInsyncReplicas?: number | null;
}

export interface ConsumerGroupResponse {
  grupo: string;
  estado: string;
  coordinador: number | null;
  asignador: string;
  miembros: { consumidorId: string; clientId: string; host: string; particiones: string[] }[];
}

export interface LagResponse {
  grupo: string;
  lagTotal: number;
  particiones: { topico: string; particion: number; offsetConsumido: number; offsetFinal: number; lag: number }[];
}

interface ErrorApi {
  mensaje?: string;
  campos?: Record<string, string>;
}

/** Cliente de kafka-admin-service: topicos, configuraciones y consumer groups. */
@Injectable({ providedIn: 'root' })
export class KafkaAdminService {
  private http = inject(HttpClient);
  private url = `${KAFKA_ADMIN_API_URL}/api/kafka`;

  listarTopicos(): Observable<TopicoResponse[]> {
    return this.http.get<TopicoResponse[]>(`${this.url}/topicos`);
  }

  obtenerTopico(nombre: string): Observable<TopicoResponse> {
    return this.http.get<TopicoResponse>(`${this.url}/topicos/${encodeURIComponent(nombre)}`);
  }

  crearTopico(req: CrearTopicoRequest): Observable<TopicoResponse> {
    return this.http.post<TopicoResponse>(`${this.url}/topicos`, limpiar(req));
  }

  actualizarConfiguracion(nombre: string, req: ActualizarConfigRequest): Observable<TopicoResponse> {
    return this.http.put<TopicoResponse>(`${this.url}/topicos/${encodeURIComponent(nombre)}/configuracion`, limpiar(req));
  }

  aumentarParticiones(nombre: string, total: number): Observable<TopicoResponse> {
    return this.http.post<TopicoResponse>(`${this.url}/topicos/${encodeURIComponent(nombre)}/particiones`, { total });
  }

  eliminarTopico(nombre: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/topicos/${encodeURIComponent(nombre)}`);
  }

  listarConsumerGroups(): Observable<ConsumerGroupResponse[]> {
    return this.http.get<ConsumerGroupResponse[]>(`${this.url}/consumer-groups`);
  }

  lag(grupo: string): Observable<LagResponse> {
    return this.http.get<LagResponse>(`${this.url}/consumer-groups/${encodeURIComponent(grupo)}/lag`);
  }
}

/** Convierte la respuesta de error del backend en un texto legible. */
export function mensajeErrorKafka(err: HttpErrorResponse): string {
  if (err.status === 0) return 'No se pudo conectar con kafka-admin-service (puerto 8084)';
  if (err.status === 401) return 'Sesion vencida: vuelve a iniciar sesion';
  if (err.status === 403) return 'No tienes permisos: se requiere el rol Admin';
  if (err.status === 503) return 'El cluster Kafka no respondio a tiempo';
  const body = err.error as ErrorApi | null;
  if (body?.campos && Object.keys(body.campos).length) {
    return Object.entries(body.campos).map(([campo, msg]) => `${campo}: ${msg}`).join(' | ');
  }
  return body?.mensaje ?? `Error ${err.status}`;
}

function limpiar<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ) as Partial<T>;
}
