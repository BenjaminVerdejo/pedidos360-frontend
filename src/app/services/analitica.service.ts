import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ANALITICA_API_URL } from '../config';

/** Un evento consumido desde Kafka (con su topico, particion y offset). */
export interface EventoProcesado {
  tipo: string;
  pedidoId: number | null;
  detalle: string;
  topico: string;
  particion: number;
  offset: number;
  timestamp: string;
}

/** Metricas calculadas por analitica-service a partir de los eventos de Kafka. */
export interface ResumenAnalitica {
  pedidosCreados: number;
  pedidosEntregados: number;
  cambiosDeEstado: number;
  ventasTotales: number;
  ventasEntregadas: number;
  ticketPromedio: number;
  pedidosPorEstado: Record<string, number>;
  eventosDuplicadosDescartados: number;
  ultimosEventos: EventoProcesado[];
  actualizadoEn: string;
}

/** Cliente de analitica-service (el JWT lo agrega el MsalInterceptor). */
@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  private http = inject(HttpClient);
  private url = `${ANALITICA_API_URL}/api/analitica`;

  resumen(): Observable<ResumenAnalitica> {
    return this.http.get<ResumenAnalitica>(`${this.url}/resumen`);
  }

  auditoria(): Observable<EventoProcesado[]> {
    return this.http.get<EventoProcesado[]>(`${this.url}/auditoria`);
  }
}
