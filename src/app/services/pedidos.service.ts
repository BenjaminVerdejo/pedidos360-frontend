import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';

export interface Cliente {
  id?: number;
  nombre: string;
  email: string;
}

export interface Pedido {
  id?: number;
  cliente: Cliente;
  descripcion: string;
  total: number;
  estado?: string;
  fecha?: string;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private http = inject(HttpClient);
  private url = `${API_URL}/api/pedidos`;

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.url);
  }

  crear(pedido: Pedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.url, pedido);
  }

  cambiarEstado(id: number, estado: string): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.url}/${id}/estado`, { estado });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
