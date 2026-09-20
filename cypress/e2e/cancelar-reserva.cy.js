/**
 * AgendaYA - Módulo 5 (Gestión de Agenda Admin)
 * Flujo: CANCELAR UNA RESERVA (M05-R02F)
 *
 * E2E-04  Happy path            : cancelación exitosa (confirmación + estado Cancelada + aviso de éxito)
 * E2E-05  Error de sistema      : el servicio de correo (M06) falla; la reserva se cancela igual y se advierte
 * E2E-06  Error por estado      : una reserva Pendiente o ya Cancelada no se puede cancelar
 *
 * Igual que en ver-reservas.cy.js, la fecha se congela en el miércoles 13/05/2026
 * para que el calendario y los ids de reserva sean siempre los mismos.
 */

const HOY = new Date(2026, 4, 13, 10, 0).getTime() // miércoles 13/05/2026 10:00

describe('AgendaYA - M05 Gestión de Agenda - Cancelar una reserva', () => {
  beforeEach(() => {
    cy.clock(HOY, ['Date'])
    cy.visit('/frontend/index.html')
  })

  // ---------------------------------------------------------------------------
  // Integrante: ____________________
  // ---------------------------------------------------------------------------
  it('E2E-04: cancelar una reserva Confirmada la pasa a "Cancelada" y muestra el aviso de éxito', () => {
    // Arrange: se selecciona la reserva de Claudia Morales (Confirmada) y su detalle habilita la cancelación
    cy.get('[data-cy="booking-res-actual-07"]').click()
    cy.get('[data-cy="detail-invitado"]').should('have.text', 'Claudia Morales')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Confirmada')
    cy.get('[data-cy="cancel-booking-btn"]').should('be.enabled')

    // Act: el administrador pulsa "Cancelar reserva" y confirma en el diálogo
    cy.get('[data-cy="cancel-booking-btn"]').click()
    cy.get('[data-cy="cancel-dialog"]').should('be.visible')
    cy.get('[data-cy="cancel-dialog-text"]').should('contain.text', 'Claudia Morales')
    cy.get('[data-cy="confirm-cancel-btn"]').click()

    // Assert: el diálogo se cierra, el estado pasa a Cancelada y se informa el resultado
    cy.get('[data-cy="cancel-dialog"]').should('not.exist')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Cancelada')
    cy.get('[data-cy="cancel-success-message"]')
      .should('be.visible')
      .and('contain.text', 'Claudia Morales')
      .and('contain.text', 'fue cancelada')
    cy.get('[data-cy="cancel-mail-error"]').should('not.exist')
    cy.get('[data-cy="cancel-booking-btn"]').should('be.disabled') // ya no se puede volver a cancelar
    cy.get('[data-cy="booking-res-actual-07"]').should('have.attr', 'data-estado', 'Cancelada') // el calendario lo refleja
  })

  // ---------------------------------------------------------------------------
  // Integrante: ____________________
  // ---------------------------------------------------------------------------
  it('E2E-05: si falla el servicio de correo la reserva se cancela igual y se advierte con un error específico', () => {
    // Arrange: se activa la simulación de falla del servicio de correo (M06) y se elige una reserva Confirmada
    cy.get('[data-cy="sim-mail-failure"]').check()
    cy.get('[data-cy="booking-res-actual-08"]').click()
    cy.get('[data-cy="detail-invitado"]').should('have.text', 'Fernando Castro')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Confirmada')

    // Act: se cancela y se confirma
    cy.get('[data-cy="cancel-booking-btn"]').click()
    cy.get('[data-cy="confirm-cancel-btn"]').click()

    // Assert: aparece el aviso de que los correos no se enviaron, NO el de éxito, y la agenda igual se actualizó
    cy.get('[data-cy="cancel-mail-error"]')
      .should('be.visible')
      .and('contain.text', 'Fernando Castro')
      .and('contain.text', 'no se pudieron enviar los correos')
    cy.get('[data-cy="cancel-success-message"]').should('not.exist')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Cancelada')
    cy.get('[data-cy="booking-res-actual-08"]').should('have.attr', 'data-estado', 'Cancelada')
  })

  // ---------------------------------------------------------------------------
  // Integrante: ____________________
  // ---------------------------------------------------------------------------
  it('E2E-06: una reserva Pendiente o ya Cancelada no se puede cancelar', () => {
    // Arrange: se selecciona una reserva Pendiente (Ana Martínez)
    cy.get('[data-cy="booking-res-actual-06"]').click()
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Pendiente')

    // Act (1): se intenta cancelar la reserva Pendiente (force: el botón está deshabilitado)
    cy.get('[data-cy="cancel-booking-btn"]').click({ force: true })

    // Assert (1): el botón está deshabilitado con su explicación, no se abre el diálogo y el estado no cambia
    cy.get('[data-cy="cancel-booking-btn"]').should('be.disabled')
    cy.get('[data-cy="cancel-disabled-hint"]')
      .should('be.visible')
      .and('contain.text', 'Confirmadas o Reagendadas')
    cy.get('[data-cy="cancel-dialog"]').should('not.exist')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Pendiente')

    // Act (2): se selecciona una reserva que ya está Cancelada (Sandra Torres)
    cy.get('[data-cy="booking-res-actual-12"]').click()

    // Assert (2): tampoco se puede cancelar de nuevo
    cy.get('[data-cy="detail-invitado"]').should('have.text', 'Sandra Torres')
    cy.get('[data-cy="detail-estado"]').should('have.text', 'Cancelada')
    cy.get('[data-cy="cancel-booking-btn"]').should('be.disabled')
    cy.get('[data-cy="cancel-disabled-hint"]').should('be.visible')
  })
})
