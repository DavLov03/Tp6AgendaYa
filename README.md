# AgendaYA - TP6 Testing Automatizado

**Grupo 10 · Módulo 5: Gestión de Agenda (Admin)** · Ingeniería y Calidad de Software 2026

Frontend mínimo de la agenda del administrador, más los tests E2E (Cypress) y unitarios (Jest).

## Flujos implementados (Tarea A)

| Flujo | Requerimiento | Qué hace |
|---|---|---|
| Ver reservas del día | M05-R01F | Calendario en vista **semana** (por defecto) o **mes**. Clic en una reserva abre el detalle. En vista mes, clic en el número del día abre el modal **"Reservas del día"**. |
| Cancelar una reserva | M05-R02F | Botón "Cancelar reserva" en el detalle → diálogo de confirmación → la reserva pasa a **Cancelada** y aparece un aviso. Solo se puede cancelar una reserva **Confirmada** o **Reagendada**. Si falla el servicio de correo (M06), la cancelación se efectúa igual y se muestra un aviso de error específico. |

Los datos viven **en memoria** (no hay backend): se reinician al recargar la página.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Git

## Instalación

```bash
npm install
```

Instala Cypress, Jest y `http-server` (ver `devDependencies` en `package.json`).

## Levantar el frontend

```bash
npm start
```

Abrir <http://localhost:3000/frontend/index.html>.
(El servidor sirve la raíz del repo porque el frontend importa `src/logica-negocio.js`.)

## Ejecutar los tests

Con el frontend levantado en una terminal (`npm start`), en otra:

```bash
npm run cy:open   # Cypress en modo interactivo
npm run cy:run    # Cypress en modo headless (guarda videos en cypress/videos/)
npm test          # Tests unitarios con Jest
```

## Tests E2E (Tarea B)

| Test | Archivo | Flujo | Variante |
|---|---|---|---|
| E2E-01 | `cypress/e2e/ver-reservas.cy.js` | Ver reservas del día (M05-R01F) | Happy path: vista semana y detalle completo |
| E2E-02 | `cypress/e2e/ver-reservas.cy.js` | Ver reservas del día (M05-R01F) | Vista mes, modal "Reservas del día" y selección desde el modal |
| E2E-03 | `cypress/e2e/ver-reservas.cy.js` | Ver reservas del día (M05-R01F) | Borde: período sin reservas y regreso con "Hoy" |
| E2E-04 | `cypress/e2e/cancelar-reserva.cy.js` | Cancelar una reserva (M05-R02F) | Happy path: cancelación exitosa |
| E2E-05 | `cypress/e2e/cancelar-reserva.cy.js` | Cancelar una reserva (M05-R02F) | Error de sistema: falla el servicio de correo |
| E2E-06 | `cypress/e2e/cancelar-reserva.cy.js` | Cancelar una reserva (M05-R02F) | Error por estado: reserva Pendiente o ya Cancelada |


Para correr un solo archivo: `npx cypress run --spec cypress/e2e/cancelar-reserva.cy.js`.

## Estructura del repositorio

```
agendaya-tp6/
├── frontend/
│   ├── index.html          # estructura y elementos estáticos
│   ├── style.css
│   └── app.js              # estado, render y acciones de la pantalla
├── src/
│   └── logica-negocio.js   # lógica pura (fechas, estados, cancelación); se usa en el frontend y en Jest
├── cypress/e2e/            # tests E2E: ver-reservas.cy.js, cancelar-reserva.cy.js
├── tests/                  # tests unitarios (*.test.js)
├── cypress.config.js       # baseUrl: http://localhost:3000
├── package.json
└── README.md
```

## Cómo escribir tests sobre este frontend

### Datos de ejemplo y fecha

Las reservas de ejemplo se generan **relativas a la semana actual** (semana anterior, actual y siguiente), con ids
estables: `res-anterior-01`…, `res-actual-01`…, `res-siguiente-01`…. Cada semana tiene las mismas 13 reservas:

| Día | ids `res-actual-XX` |
|---|---|
| Martes | 01 Laura Pérez (Confirmada), 02 María González (Confirmada), 03 Miguel Sánchez (**Pendiente**), 04 Carlos Rodríguez (Confirmada), 05 Lucía Fernández (**Reagendada**) |
| Miércoles | 06 Ana Martínez (**Pendiente**), 07 Claudia Morales (Confirmada), 08 Fernando Castro (Confirmada), 09 Diego Herrera (Confirmada) |
| Jueves | 10 Patricia López (Confirmada) |
| Viernes | 11 Jorge Ramírez (Confirmada), 12 Sandra Torres (**Cancelada**) |
| Sábado | 13 Roberto Díaz (Confirmada) |

Para que los tests no dependan del día en que se ejecutan, conviene **congelar la fecha** antes de visitar la página:

```js
// Miércoles 13/05/2026: semana del 11 al 17 de mayo (la misma del wireframe)
cy.clock(new Date(2026, 4, 13, 10, 0).getTime(), ['Date'])
cy.visit('/frontend/index.html')
```

### Herramientas de prueba (pie de la pantalla)

| `data-cy` | Qué hace |
|---|---|
| `sim-mail-failure` | Checkbox: simula que el servicio de correo (M06) falla al cancelar |
| `reset-data` | Vuelve a los datos de ejemplo, vista semana y sin selección |

### Referencia de `data-cy`

**Encabezado:** `calendar-title`, `nav-prev`, `nav-today`, `nav-next`, `view-week`, `view-month`

**Calendario:**
`calendar-week` · `week-day-YYYY-MM-DD` · `week-col-YYYY-MM-DD` ·
`calendar-month` · `day-cell-YYYY-MM-DD` · `day-open-YYYY-MM-DD` (botón del número del día) · `day-count-YYYY-MM-DD` (cantidad de reservas) ·
`booking-<id>` (reserva en el calendario; atributo `data-estado` con el estado) ·
`empty-period-message` (período sin reservas)

> En vista mes cada celda muestra como máximo 2 reservas (`booking-<id>`); el resto se ve en el modal del día.

**Detalle de reserva:** `detail-panel`, `detail-placeholder`, `detail-close`, `detail-invitado`, `detail-tipo-evento`, `detail-fecha`, `detail-horario`, `detail-modalidad`, `detail-ubicacion`, `detail-estado`, `cancel-booking-btn`, `cancel-disabled-hint`

**Modal "Reservas del día":** `day-modal`, `day-modal-title`, `day-modal-date`, `day-modal-close`, `day-booking-<id>`, `day-modal-empty`

**Cancelación:** `cancel-dialog`, `cancel-dialog-text`, `abort-cancel-btn`, `confirm-cancel-btn` ·
avisos: `cancel-success-message`, `cancel-mail-error`, `cancel-error-message`, `banner-close`

## Convenciones

- Fechas de reservas como `'YYYY-MM-DD'` y horas como `'HH:MM'` (strings, sin zonas horarias).
- Las funciones de `src/logica-negocio.js` no mutan sus argumentos.
- Los commits deben ser descriptivos y mostrar el progreso (requisito del TP).
