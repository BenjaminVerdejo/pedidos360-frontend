import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of, switchMap, timer } from 'rxjs';
import { AnaliticaService, ResumenAnalitica } from '../services/analitica.service';

/** Cada cuanto se consulta analitica-service (ms). */
export const INTERVALO_MS = 3000;

/**
 * Analitica en tiempo real. Los numeros cambian solos cuando se crea o entrega un pedido:
 * pedidos-service publica el evento en Kafka -> analitica-service lo consume -> esta vista lo muestra.
 */
@Component({
  selector: 'app-analitica',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './analitica.html',
  styleUrl: './analitica.css'
})
export class Analitica implements OnInit {
  private api = inject(AnaliticaService);
  private destroyRef = inject(DestroyRef);

  readonly resumen = signal<ResumenAnalitica | null>(null);
  readonly error = signal('');
  readonly estados = ['PENDIENTE', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

  ngOnInit(): void {
    timer(0, INTERVALO_MS)
      .pipe(
        switchMap(() =>
          this.api.resumen().pipe(
            catchError((err: HttpErrorResponse) => {
              this.error.set(
                err.status === 0
                  ? 'No hay conexión con analitica-service (puerto 8083)'
                  : `Error ${err.status} al consultar la analítica`
              );
              return of(null);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((r) => {
        if (r) {
          this.error.set('');
          this.resumen.set(r);
        }
      });
  }

  /** Porcentaje del total de pedidos que esta en un estado (para la barra). */
  porcentaje(estado: string): number {
    const r = this.resumen();
    if (!r || r.pedidosCreados === 0) return 0;
    return Math.round(((r.pedidosPorEstado[estado] ?? 0) * 100) / r.pedidosCreados);
  }
}
