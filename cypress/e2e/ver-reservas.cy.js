/**
 * AgendaYA - Módulo 5 (Gestión de Agenda Admin)
 * Flujo: VER RESERVAS DEL DÍA (M05-R01F)
 *
 * E2E-01  Happy path      : vista semana por defecto y detalle completo de una reserva
 * E2E-02  Variante mes    : vista mes, contador, modal "Reservas del día" y selección desde el modal
 * E2E-03  Estado borde    : período sin reservas (mensaje informativo) y regreso con "Hoy"
 *
 * Datos: las reservas de ejemplo se generan relativas a la semana actual (ver README).
 * Para que los tests no dependan del día en que corren, se congela la fecha en el
 * miércoles 13/05/2026 (semana del 11 al 17 de mayo, la misma del wireframe del TP1).
 */

const HOY = new Date(2026, 4, 13, 10, 0).getTime() // miércoles 13/05/2026 10:00

describe('AgendaYA - M05 Gestión de Agenda - Ver reservas del día', () => {
  beforeEach(() => {
    cy.clock(HOY, ['Date']) // solo se congela Date; los timers siguen funcionando
    cy.visit('/frontend/index.html')
  })

  // ---------------------------------------------------------------------------
  // 
  // ---------------------------------------------------------------------------
  it('E2E-01: en vista semana (por defecto) al seleccionar una reserva se muestra su detalle completo', () => {
    // Arrange: el calendario abre en vista semana, en la semana actual y sin ninguna reserva seleccionada
    cy.get('[data-cy="calendar-title"]').should('have.text', 'Mayo 2026')
    cy.get('[data-cy="calendar-week"]').should('be.visible')
    cy.get('[data-cy="week-day-2026-05-13"]').should('be.visible') // el miércoles 13 pertenece a la semana visible
    cy.get('[data-cy="detail-placeholder"]').should('be.visible')

    // Act: el administrador selecciona la reserva de Ana Martínez (miércoles 13, 09:00)
    cy.get('[data-cy="booking-res-actual-06"]').click()

    // Assert: el panel muestra todos los datos que pide el M05-R01F
    cy.get('[data-cy="detail-placeholder"]').should('not.exist')
    cy.get('[data-cy="detail-invitado"]').should('have.text', 'Ana Martínez')
    cy.get('[data-cy="detail-tipo-evento"]').should('have.text', 'Consultoría')
    cy.get('[data-cy="detail-fecha"]').should('have.text', 'Miércoles, 13 de mayo de 2026')
    cy.get('[data-cy="detail-horario"]').should('have.text', '09:00 - 10:30')
    cy.get('[data-cy="detail-modalidad"]').should('have.text', 'Presencial')
    cy.get('[data-cy="detail-ubicacion"]').should('have.text', 'Oficina 302')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Pendiente')
  })

  // ---------------------------------------------------------------------------
  // 
  // ---------------------------------------------------------------------------
  it('E2E-02: en vista mes el día se abre en "Reservas del día" y desde ahí se accede al detalle de una reserva', () => {
    // Arrange: se cambia a la vista mes; el miércoles 13 tiene 4 reservas
    cy.get('[data-cy="view-month"]').click()
    cy.get('[data-cy="calendar-month"]').should('be.visible')
    cy.get('[data-cy="calendar-title"]').should('have.text', 'Mayo 2026')
    cy.get('[data-cy="day-count-2026-05-13"]').should('have.text', '4')

    // Act: se abre el día 13 y se elige la reserva de Fernando Castro dentro del modal
    cy.get('[data-cy="day-open-2026-05-13"]').click()

    // Assert (1): el modal lista las 4 reservas del día, con su fecha
    cy.get('[data-cy="day-modal"]').should('be.visible')
    cy.get('[data-cy="day-modal-title"]').should('have.text', 'Reservas del día')
    cy.get('[data-cy="day-modal-date"]').should('have.text', 'Miércoles, 13 de mayo de 2026')
    cy.get('[data-cy^="day-booking-"]').should('have.length', 4)

    // Act (2): se selecciona una reserva desde el modal
    cy.get('[data-cy="day-booking-res-actual-08"]').click()

    // Assert (2): el modal se cierra y el panel lateral muestra el detalle de esa reserva
    cy.get('[data-cy="day-modal"]').should('not.exist')
    cy.get('[data-cy="detail-invitado"]').should('have.text', 'Fernando Castro')
    cy.get('[data-cy="detail-horario"]').should('have.text', '14:00 - 16:00')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Confirmada')
  })

  // ---------------------------------------------------------------------------
  // 
  // ---------------------------------------------------------------------------
  it('E2E-03: un período sin reservas muestra el calendario vacío con mensaje informativo y "Hoy" vuelve a la semana con reservas', () => {
    // Arrange: la semana actual tiene reservas, por lo que no hay mensaje de período vacío
    cy.get('[data-cy="booking-res-actual-06"]').should('be.visible')
    cy.get('[data-cy="empty-period-message"]').should('not.exist')

    // Act: se avanza dos semanas (25 al 31 de mayo), donde no hay reservas cargadas
    cy.get('[data-cy="nav-next"]').click()
    cy.get('[data-cy="nav-next"]').click()

    // Assert (1): el calendario sigue visible (vacío) y aparece el mensaje informativo
    cy.get('[data-cy="week-day-2026-05-25"]').should('be.visible')
    cy.get('[data-cy="calendar-week"]').should('be.visible')
    cy.get('[data-cy="empty-period-message"]')
      .should('be.visible')
      .and('contain.text', 'No hay reservas en este período')
    cy.get('[data-cy="booking-res-actual-06"]').should('not.exist')

    // Act (2): el administrador vuelve al presente con "Hoy"
    cy.get('[data-cy="nav-today"]').click()

    // Assert (2): desaparece el mensaje y vuelven a verse las reservas de la semana actual
    cy.get('[data-cy="empty-period-message"]').should('not.exist')
    cy.get('[data-cy="week-day-2026-05-13"]').should('be.visible')
    cy.get('[data-cy="booking-res-actual-06"]').should('be.visible')
  })
})
