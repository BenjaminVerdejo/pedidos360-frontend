import { Component, OnInit, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { API_SCOPE } from '../config';
import { obtenerRoles } from '../auth/roles';
import { Pedido, PedidosService } from '../services/pedidos.service';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  templateUrl: './pedidos.html'
})
export class Pedidos implements OnInit {
  private pedidosService = inject(PedidosService);
  private auth = inject(MsalService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly roles = signal<string[]>([]);
  readonly scopes = signal<string[]>([]);

  get esAdmin(): boolean {
    return this.roles().includes('Admin');
  }

  ngOnInit(): void {
    const instance = this.auth.instance;
    const cuenta = instance.getActiveAccount() ?? instance.getAllAccounts()[0];

    // roles: vienen en los claims del token del usuario
    this.roles.set(obtenerRoles(this.auth));

    // scopes: vienen en el access token que se usa para llamar a la API
    if (cuenta) {
      this.auth.acquireTokenSilent({ scopes: [API_SCOPE], account: cuenta }).subscribe({
        next: (r) => this.scopes.set(r.scopes.map((s) => s.split('/').pop() ?? s)),
        error: () => this.scopes.set([])
      });
    }

    this.cargar();
  }

  cargar() {
    this.pedidosService.listar().subscribe({
      next: (data) => { this.pedidos.set(data); this.error.set(''); },
      error: (err) => this.error.set(`Error ${err.status} al cargar los pedidos`)
    });
  }

  crear(nombre: string, email: string, descripcion: string, total: string) {
    this.pedidosService
      .crear({ cliente: { nombre, email }, descripcion, total: Number(total) })
      .subscribe({
        next: (p) => {
          // el backend publica el evento en RabbitMQ: notificacion + ticket se procesan en segundo plano
          this.aviso.set(`Pedido #${p.id} creado. Notificación y ticket enviados a RabbitMQ para procesarse en segundo plano.`);
          this.cargar();
        },
        error: (err) => this.error.set(`Error ${err.status} al crear el pedido`)
      });
  }

  cambiarEstado(p: Pedido, estado: string) {
    if (p.id == null) return;
    this.pedidosService.cambiarEstado(p.id, estado).subscribe({
      next: () => {
        this.aviso.set(estado === 'ENTREGADO'
          ? `Pedido #${p.id} ENTREGADO. Notificación (topic) y comprobante de entrega (direct) enviados a RabbitMQ.`
          : `Pedido #${p.id} cambió a ${estado}. Se envió la notificación por RabbitMQ.`);
        this.cargar();
      },
      error: (err) => this.error.set(`Error ${err.status} al cambiar el estado`)
    });
  }

  eliminar(p: Pedido) {
    if (p.id == null) return;
    this.pedidosService.eliminar(p.id).subscribe({
      next: () => this.cargar(),
      error: (err) => this.error.set(err.status === 403 ? 'No tienes permiso (solo Admin)' : `Error ${err.status}`)
    });
  }
}
