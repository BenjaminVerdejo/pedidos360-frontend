// Cambiar apiUrl por la URL del API Gateway cuando este desplegado
// (ej: https://xxxx.execute-api.us-east-1.amazonaws.com/prod)
export const API_URL = 'http://localhost:8081';

// Microservicio administrador de RabbitMQ (rabbit-admin-service)
export const ADMIN_API_URL = 'http://localhost:8082';

export const CLIENT_ID = '82adc866-3948-44f8-993d-5658734ad794';
export const TENANT_ID = '015cad58-1396-4898-9f0a-4cb1e1191c38';
export const API_SCOPE = `api://${CLIENT_ID}/Pedidos.Access`;
