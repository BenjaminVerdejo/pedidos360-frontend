import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { Inicio } from './inicio/inicio';
import { Pedidos } from './pedidos/pedidos';
import { adminGuard } from './auth/roles';

export const routes: Routes = [
  { path: '', component: Inicio },
  // ruta protegida: si no hay sesion, el guard abre el login
  { path: 'pedidos', component: Pedidos, canActivate: [MsalGuard] },
  // solo Admin: administracion de colas, exchanges y bindings de RabbitMQ (carga diferida)
  {
    path: 'admin-rabbitmq',
    loadComponent: () => import('./rabbit-admin/rabbit-admin').then((m) => m.RabbitAdmin),
    canActivate: [MsalGuard, adminGuard]
  },
  { path: '**', redirectTo: '' }
];
