/**
 * AgendaYA - Módulo 5 (Gestión de Agenda Admin)
 * Tests unitarios de la lógica de negocio (src/logica-negocio.js).
 *
 * Cubren los dos flujos del módulo:
 *   M05-R01F  Ver reservas del día  -> orden, filtro por estado, día y período, calendario
 *   M05-R02F  Cancelar una reserva  -> estados cancelables, errores y liberación de franja
 *
 * Cada caso sigue Arrange / Act / Assert. No tocan el DOM.
 */

const L = require('../src/logica-negocio');

function reserva(parcial = {}) {
  return {
    id: 'r1',
    invitado: 'Laura Pérez',
    tipoEvento: 'Reunión equipo',
    fecha: '2026-05-12',
    horaInicio: '09:00',
    horaFin: '10:00',
    modalidad: 'Presencial',
    ubicacion: 'Oficina 302',
    estado: L.ESTADOS.CONFIRMADA,
    ...parcial,
  };
}

describe('AgendaYA - M05 Gestión de Agenda - lógica de negocio', () => {
  // ---------------------------------------------------------------------------
  // 
  // Ordenamiento por fecha (M05). Casos: normal, descendente, borde e inválido.
  // ---------------------------------------------------------------------------
  describe('ordenarReservasPorFecha', () => {
    const desordenadas = [
      reserva({ id: 'tarde', fecha: '2026-05-12', horaInicio: '16:00', horaFin: '17:00' }),
      reserva({ id: 'otro-dia', fecha: '2026-05-13', horaInicio: '09:00', horaFin: '10:00' }),
      reserva({ id: 'manana', fecha: '2026-05-12', horaInicio: '09:00', horaFin: '10:00' }),
    ];

    it('ordena ascendente por fecha y, a igual fecha, por hora de inicio', () => {
      // Arrange: tres reservas en distinto orden de fecha y hora
      const reservas = desordenadas.map((r) => ({ ...r }));

      // Act
      const ordenadas = L.ordenarReservasPorFecha(reservas, 'asc');

      // Assert
      expect(ordenadas.map((r) => r.id)).toEqual(['manana', 'tarde', 'otro-dia']);
    });

    it('ordena descendente invirtiendo fecha y, a igual fecha, la hora', () => {
      // Arrange
      const reservas = desordenadas.map((r) => ({ ...r }));

      // Act
      const ordenadas = L.ordenarReservasPorFecha(reservas, 'desc');

      // Assert
      expect(ordenadas.map((r) => r.id)).toEqual(['otro-dia', 'tarde', 'manana']);
    });

    it('no muta el array original ni sus reservas', () => {
      // Arrange
      const reservas = desordenadas.map((r) => ({ ...r }));
      const idsOriginales = reservas.map((r) => r.id);
      const primera = reservas[0];

      // Act
      const ordenadas = L.ordenarReservasPorFecha(reservas, 'asc');

      // Assert
      expect(reservas.map((r) => r.id)).toEqual(idsOriginales);
      expect(ordenadas).not.toBe(reservas);
      expect(reservas[0]).toBe(primera);
    });

    it('lanza error si el orden no es "asc" ni "desc"', () => {
      // Arrange
      const reservas = [reserva()];

      // Act + Assert
      expect(() => L.ordenarReservasPorFecha(reservas, 'alfabetico')).toThrow(
        'Orden inválido: "alfabetico"'
      );
    });

    it('lanza error si no recibe un array de reservas', () => {
      // Act + Assert
      expect(() => L.ordenarReservasPorFecha(null)).toThrow(TypeError);
      expect(() => L.ordenarReservasPorFecha(null)).toThrow('Se esperaba un array de reservas');
    });
  });

  // ---------------------------------------------------------------------------
  // 
  // Filtrado por estado (M05). Casos: normal, sin coincidencias e inválido.
  // ---------------------------------------------------------------------------
  describe('filtrarReservasPorEstado', () => {
    const reservas = [
      reserva({ id: 'c1', estado: L.ESTADOS.CONFIRMADA }),
      reserva({ id: 'p1', estado: L.ESTADOS.PENDIENTE }),
      reserva({ id: 'c2', estado: L.ESTADOS.CONFIRMADA }),
      reserva({ id: 'x1', estado: L.ESTADOS.CANCELADA }),
    ];

    it('devuelve solo las reservas del estado pedido', () => {
      // Arrange: mezcla de Confirmada, Pendiente y Cancelada

      // Act
      const confirmadas = L.filtrarReservasPorEstado(reservas, L.ESTADOS.CONFIRMADA);

      // Assert
      expect(confirmadas.map((r) => r.id)).toEqual(['c1', 'c2']);
      expect(confirmadas.every((r) => r.estado === L.ESTADOS.CONFIRMADA)).toBe(true);
    });

    it('devuelve un array vacío cuando ninguna reserva coincide', () => {
      // Arrange: no hay reservas Reagendadas

      // Act
      const reagendadas = L.filtrarReservasPorEstado(reservas, L.ESTADOS.REAGENDADA);

      // Assert
      expect(reagendadas).toEqual([]);
      expect(reservas).toHaveLength(4);
    });

    it('lanza error si el estado no existe', () => {
      // Act + Assert
      expect(() => L.filtrarReservasPorEstado(reservas, 'Borrador')).toThrow(
        'Estado inválido: "Borrador"'
      );
    });

    it('lanza error si la lista no es un array', () => {
      // Act + Assert
      expect(() => L.filtrarReservasPorEstado(undefined, L.ESTADOS.CONFIRMADA)).toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // 
  // Ver reservas del día y del período (M05-R01F).
  // ---------------------------------------------------------------------------
  describe('obtenerReservasDelDia y obtenerReservasDelPeriodo', () => {
    const reservas = [
      reserva({ id: 'mar-tarde', fecha: '2026-05-12', horaInicio: '16:00', horaFin: '17:00' }),
      reserva({ id: 'mie', fecha: '2026-05-13', horaInicio: '09:00', horaFin: '10:00' }),
      reserva({ id: 'mar-manana', fecha: '2026-05-12', horaInicio: '09:00', horaFin: '10:00' }),
      reserva({ id: 'jue', fecha: '2026-05-14', horaInicio: '11:00', horaFin: '12:00' }),
    ];

    it('devuelve las reservas de un día ordenadas por hora de inicio', () => {
      // Arrange: el martes 12/05 tiene dos reservas cargadas al revés

      // Act
      const delMartes = L.obtenerReservasDelDia(reservas, '2026-05-12');

      // Assert
      expect(delMartes.map((r) => r.id)).toEqual(['mar-manana', 'mar-tarde']);
    });

    it('devuelve un array vacío si el día no tiene reservas', () => {
      // Act
      const delLunes = L.obtenerReservasDelDia(reservas, '2026-05-11');

      // Assert
      expect(delLunes).toEqual([]);
    });

    it('incluye los dos extremos del período y excluye lo que queda afuera', () => {
      // Arrange: desde el 12 inclusive hasta el 13 inclusive

      // Act
      const periodo = L.obtenerReservasDelPeriodo(reservas, '2026-05-12', '2026-05-13');

      // Assert
      expect(periodo.map((r) => r.id)).toEqual(['mar-manana', 'mar-tarde', 'mie']);
    });
  });

  // ---------------------------------------------------------------------------
  // 
  // Cancelar una reserva (M05-R02F). Solo Confirmada o Reagendada.
  // ---------------------------------------------------------------------------
  describe('cancelarReserva', () => {
    it('cancela una reserva Confirmada, libera la franja y no muta los datos originales', () => {
      // Arrange
      const original = reserva({ id: 'res-07', estado: L.ESTADOS.CONFIRMADA });
      const otra = reserva({ id: 'res-08', estado: L.ESTADOS.CONFIRMADA });
      const reservas = [original, otra];

      // Act
      const resultado = L.cancelarReserva(reservas, 'res-07');

      // Assert
      expect(resultado.reserva.estado).toBe(L.ESTADOS.CANCELADA);
      expect(resultado.reserva.id).toBe('res-07');
      expect(L.ocupaFranja(resultado.reserva)).toBe(false);
      expect(resultado.reservas.map((r) => r.estado)).toEqual([
        L.ESTADOS.CANCELADA,
        L.ESTADOS.CONFIRMADA,
      ]);
      expect(original.estado).toBe(L.ESTADOS.CONFIRMADA);
      expect(L.ocupaFranja(original)).toBe(true);
      expect(reservas[1]).toBe(otra);
      expect(L.puedeCancelarse(resultado.reserva)).toBe(false);
    });

    it('cancela una reserva Reagendada', () => {
      // Arrange
      const reservas = [reserva({ id: 'res-05', estado: L.ESTADOS.REAGENDADA })];

      // Act
      const { reserva: cancelada } = L.cancelarReserva(reservas, 'res-05');

      // Assert
      expect(cancelada.estado).toBe(L.ESTADOS.CANCELADA);
      expect(L.puedeCancelarse(reservas[0])).toBe(true);
    });

    it('rechaza cancelar una reserva Pendiente', () => {
      // Arrange
      const reservas = [reserva({ id: 'res-06', estado: L.ESTADOS.PENDIENTE })];

      // Act + Assert
      expect(L.puedeCancelarse(reservas[0])).toBe(false);
      expect(() => L.cancelarReserva(reservas, 'res-06')).toThrow(
        'No se puede cancelar una reserva en estado "Pendiente"'
      );
      expect(reservas[0].estado).toBe(L.ESTADOS.PENDIENTE);
    });

    it('rechaza cancelar una reserva que ya está Cancelada', () => {
      // Arrange
      const reservas = [reserva({ id: 'res-12', estado: L.ESTADOS.CANCELADA })];

      // Act + Assert
      expect(() => L.cancelarReserva(reservas, 'res-12')).toThrow(
        'No se puede cancelar una reserva en estado "Cancelada"'
      );
    });

    it('lanza error si el id no existe', () => {
      // Arrange
      const reservas = [reserva({ id: 'res-01' })];

      // Act + Assert
      expect(() => L.cancelarReserva(reservas, 'res-inexistente')).toThrow(
        'No existe la reserva "res-inexistente"'
      );
    });

    it('puedeCancelarse es falso si no hay reserva', () => {
      // Act + Assert
      expect(L.puedeCancelarse(null)).toBe(false);
      expect(L.puedeCancelarse(undefined)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 
  // Fechas del calendario (M05-R01F): formatos inválidos y bordes de semana/mes.
  // ---------------------------------------------------------------------------
  describe('fechas y calendario', () => {
    it('formatea y vuelve a interpretar una fecha local', () => {
      // Arrange: 13 de mayo de 2026 (miércoles del wireframe)
      const fecha = new Date(2026, 4, 13);

      // Act
      const texto = L.formatearFecha(fecha);
      const parseada = L.parsearFecha(texto);

      // Assert
      expect(texto).toBe('2026-05-13');
      expect(parseada.getFullYear()).toBe(2026);
      expect(parseada.getMonth()).toBe(4);
      expect(parseada.getDate()).toBe(13);
    });

    it('rechaza una fecha inexistente como el 31 de febrero', () => {
      // Act + Assert
      expect(() => L.parsearFecha('2026-02-31')).toThrow('Fecha inválida: "2026-02-31"');
    });

    it('rechaza un formato de fecha que no sea YYYY-MM-DD', () => {
      // Act + Assert
      expect(() => L.parsearFecha('13/05/2026')).toThrow('Fecha inválida: "13/05/2026"');
    });

    it('rechaza un Date inválido al formatear', () => {
      // Act + Assert
      expect(() => L.formatearFecha(new Date('no-es-fecha'))).toThrow(TypeError);
      expect(() => L.formatearFecha('2026-05-13')).toThrow(TypeError);
    });

    it('arma el texto largo de una fecha de reserva', () => {
      // Act
      const texto = L.formatearFechaLarga('2026-05-13');

      // Assert
      expect(texto).toBe('Miércoles, 13 de mayo de 2026');
    });

    it('toma el lunes anterior cuando la fecha cae domingo', () => {
      // Arrange: domingo 17/05/2026; la semana del calendario es 11 al 17
      const domingo = new Date(2026, 4, 17);

      // Act
      const lunes = L.inicioDeSemana(domingo);
      const dias = L.diasDeSemana(domingo);

      // Assert
      expect(L.formatearFecha(lunes)).toBe('2026-05-11');
      expect(dias).toHaveLength(7);
      expect(L.formatearFecha(dias[0])).toBe('2026-05-11');
      expect(L.formatearFecha(dias[6])).toBe('2026-05-17');
      expect(dias[0].getDay()).toBe(1);
    });

    it('al avanzar un mes desde el día 31 no se desborda al mes siguiente', () => {
      // Arrange: 31 de enero + 1 mes no debe caer en marzo
      const finDeEnero = new Date(2026, 0, 31);

      // Act
      const febrero = L.moverPeriodo('mes', finDeEnero, 1);

      // Assert
      expect(L.formatearFecha(febrero)).toBe('2026-02-01');
    });

    it('desplaza la vista semana de a 7 días y rechaza una vista desconocida', () => {
      // Arrange
      const miercoles = new Date(2026, 4, 13);

      // Act
      const siguiente = L.moverPeriodo('semana', miercoles, 1);
      const anterior = L.moverPeriodo('semana', miercoles, -1);

      // Assert
      expect(L.formatearFecha(siguiente)).toBe('2026-05-20');
      expect(L.formatearFecha(anterior)).toBe('2026-05-06');
      expect(() => L.moverPeriodo('dia', miercoles, 1)).toThrow('Vista inválida: "dia"');
    });

    it('titula el mes, la semana dentro del mismo mes y la semana que cruza de año', () => {
      // Arrange
      const mayo = new Date(2026, 4, 13);
      const finDeAnio = new Date(2026, 11, 31); // jueves; la semana va del 28/12 al 03/01

      // Act + Assert
      expect(L.tituloPeriodo('mes', mayo)).toBe('Mayo 2026');
      expect(L.tituloPeriodo('semana', mayo)).toBe('Mayo 2026');
      expect(L.tituloPeriodo('semana', finDeAnio)).toBe('Diciembre 2026 – Enero 2027');
      expect(() => L.tituloPeriodo('anio', mayo)).toThrow('Vista inválida: "anio"');
    });

    it('marca como fuera de mes los días de la grilla que pertenecen al mes vecino', () => {
      // Arrange: mayo 2026 empieza viernes; la primera semana incluye días de abril
      const mayo = new Date(2026, 4, 1);

      // Act
      const semanas = L.grillaDelMes(mayo);
      const primera = semanas[0];

      // Assert
      expect(primera).toHaveLength(7);
      expect(primera[0]).toEqual({ fecha: '2026-04-27', delMes: false });
      expect(primera[4]).toEqual({ fecha: '2026-05-01', delMes: true });
      expect(semanas.at(-1).at(-1).fecha).toBe('2026-05-31');
      expect(semanas.every((semana) => semana.length === 7)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 
  // Duración de la franja horaria usada para dibujar cada reserva.
  // ---------------------------------------------------------------------------
  describe('duracionEnMinutos', () => {
    it('calcula los minutos entre dos horas válidas', () => {
      // Act
      const minutos = L.duracionEnMinutos('09:00', '10:30');

      // Assert
      expect(minutos).toBe(90);
      expect(L.horaAMinutos('09:00')).toBe(540);
    });

    it('rechaza una hora de fin que no sea posterior al inicio', () => {
      // Act + Assert
      expect(() => L.duracionEnMinutos('10:00', '10:00')).toThrow(
        'La hora de fin debe ser posterior a la hora de inicio'
      );
      expect(() => L.duracionEnMinutos('11:00', '09:00')).toThrow(
        'La hora de fin debe ser posterior a la hora de inicio'
      );
    });

    it('rechaza una hora con formato inválido', () => {
      // Act + Assert
      expect(() => L.horaAMinutos('24:00')).toThrow('Hora inválida: "24:00"');
      expect(() => L.horaAMinutos('9:00')).toThrow('Hora inválida: "9:00"');
    });
  });
});
