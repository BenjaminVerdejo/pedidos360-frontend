## Descripcion del cambio

<!-- Que se cambio y por que. Enlazar el issue o requerimiento (REQ-xx). -->

## Checklist de calidad y seguridad (obligatorio)

- [ ] El pipeline **CI Seguridad y Calidad** esta en verde (pruebas, SAST, secretos, SCA, contenedores, DAST)
- [ ] Agregue o actualice pruebas automatizadas para el cambio
- [ ] No hay credenciales, tokens ni datos personales en el codigo, logs ni commits
- [ ] Toda entrada nueva del usuario se valida (DTO + Bean Validation) y los errores no exponen detalles internos
- [ ] Los endpoints nuevos exigen autenticacion y el permiso minimo necesario (scope / rol)
- [ ] Si se tratan datos personales nuevos: finalidad documentada y minimizacion aplicada (Ley 21.719)
- [ ] Actualice la documentacion (README / docs) si cambia el comportamiento

## Evidencia

<!-- Capturas o enlaces a la ejecucion del pipeline / reportes -->
