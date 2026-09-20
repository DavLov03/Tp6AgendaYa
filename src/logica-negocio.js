/**
 * AgendaYA - Módulo 5: Gestión de Agenda (Admin)
 * Lógica de negocio pura (sin DOM). Se usa desde el frontend (global AgendaLogica)
 * y desde los tests unitarios con Jest (module.exports).
 *
 * Convenciones:
 *  - Las fechas de reserva son strings 'YYYY-MM-DD' y las horas 'HH:MM' (evita problemas de zona horaria).
 *  - Las funciones no mutan sus argumentos: devuelven copias nuevas.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AgendaLogica = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // ---------------------------------------------------------------------------
  // Constantes
  // ---------------------------------------------------------------------------
  const ESTADOS = Object.freeze({
    CONFIRMADA: 'Confirmada',
    PENDIENTE: 'Pendiente',
    REAGENDADA: 'Reagendada',
    CANCELADA: 'Cancelada',
  });

  // M05-R02F: solo se puede cancelar una reserva "Confirmada" o "Reagendada".
  const ESTADOS_CANCELABLES = Object.freeze([ESTADOS.CONFIRMADA, ESTADOS.REAGENDADA]);

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // ---------------------------------------------------------------------------
  // Fechas y horas
  // ---------------------------------------------------------------------------
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /** Date -> 'YYYY-MM-DD' (en hora local). */
  function formatearFecha(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      throw new TypeError('formatearFecha: se esperaba un Date válido');
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /** 'YYYY-MM-DD' -> Date local a las 00:00. Lanza error si el formato o la fecha son inválidos. */
  function parsearFecha(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str));
    if (!m) throw new Error(`Fecha inválida: "${str}"`);
    const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const d = new Date(anio, mes - 1, dia);
    // Rechaza fechas inexistentes como 2026-02-31 (que Date "corrige" a marzo).
    if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
      throw new Error(`Fecha inválida: "${str}"`);
    }
    return d;
  }

  /** 'HH:MM' -> minutos desde las 00:00. */
  function horaAMinutos(hhmm) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm));
    if (!m) throw new Error(`Hora inválida: "${hhmm}"`);
    return Number(m[1]) * 60 + Number(m[2]);
  }

  /** Duración en minutos entre dos horas 'HH:MM'. La hora de fin debe ser posterior a la de inicio. */
  function duracionEnMinutos(horaInicio, horaFin) {
    const dur = horaAMinutos(horaFin) - horaAMinutos(horaInicio);
    if (dur <= 0) throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    return dur;
  }

  /** Lunes de la semana de `date` (las semanas del calendario empiezan en lunes). */
  function inicioDeSemana(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diaSemana = d.getDay(); // 0 = domingo
    const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
    d.setDate(d.getDate() + offset);
    return d;
  }

  /** Los 7 días (lunes a domingo) de la semana que contiene a `date`. */
  function diasDeSemana(date) {
    const lunes = inicioDeSemana(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return d;
    });
  }

  /**
   * Grilla del mes para la vista mensual: array de semanas (lunes a domingo),
   * cada una con 7 celdas { fecha: 'YYYY-MM-DD', delMes: boolean }.
   */
  function grillaDelMes(date) {
    const primero = new Date(date.getFullYear(), date.getMonth(), 1);
    const ultimo = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const semanas = [];
    let cursor = inicioDeSemana(primero);
    while (cursor <= ultimo) {
      semanas.push(
        Array.from({ length: 7 }, (_, i) => {
          const d = new Date(cursor);
          d.setDate(cursor.getDate() + i);
          return { fecha: formatearFecha(d), delMes: d.getMonth() === date.getMonth() };
        })
      );
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }
    return semanas;
  }

  /** Desplaza la fecha de referencia una semana o un mes (delta = -1 / +1). */
  function moverPeriodo(vista, date, delta) {
    if (vista === 'semana') {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      d.setDate(d.getDate() + 7 * delta);
      return d;
    }
    if (vista === 'mes') {
      // Se fija el día 1 para evitar desbordes (ej. 31 de enero + 1 mes).
      return new Date(date.getFullYear(), date.getMonth() + delta, 1);
    }
    throw new Error(`Vista inválida: "${vista}"`);
  }

  /** Título del encabezado del calendario, ej. "Mayo 2026" o "Mayo – Junio 2026". */
  function tituloPeriodo(vista, date) {
    if (vista === 'mes') return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
    if (vista === 'semana') {
      const dias = diasDeSemana(date);
      const ini = dias[0];
      const fin = dias[6];
      if (ini.getFullYear() !== fin.getFullYear()) {
        return `${MESES[ini.getMonth()]} ${ini.getFullYear()} – ${MESES[fin.getMonth()]} ${fin.getFullYear()}`;
      }
      if (ini.getMonth() !== fin.getMonth()) {
        return `${MESES[ini.getMonth()]} – ${MESES[fin.getMonth()]} ${fin.getFullYear()}`;
      }
      return `${MESES[ini.getMonth()]} ${ini.getFullYear()}`;
    }
    throw new Error(`Vista inválida: "${vista}"`);
  }

  /** 'YYYY-MM-DD' -> "Miércoles, 13 de mayo de 2026". */
  function formatearFechaLarga(fechaStr) {
    const d = parsearFecha(fechaStr);
    return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
  }

  // ---------------------------------------------------------------------------
  // Reservas
  // ---------------------------------------------------------------------------
  function validarLista(reservas) {
    if (!Array.isArray(reservas)) throw new TypeError('Se esperaba un array de reservas');
  }

  /** Compara por fecha y luego por hora de inicio. */
  function compararPorFechaHora(a, b) {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    return horaAMinutos(a.horaInicio) - horaAMinutos(b.horaInicio);
  }

  /** M05: ordenamiento por fecha (y hora). orden = 'asc' | 'desc'. No muta el array original. */
  function ordenarReservasPorFecha(reservas, orden = 'asc') {
    validarLista(reservas);
    if (orden !== 'asc' && orden !== 'desc') throw new Error(`Orden inválido: "${orden}"`);
    const copia = [...reservas].sort(compararPorFechaHora);
    return orden === 'desc' ? copia.reverse() : copia;
  }

  /** M05: filtrado de reservas por estado. Si el estado no existe, lanza error. */
  function filtrarReservasPorEstado(reservas, estado) {
    validarLista(reservas);
    if (!Object.values(ESTADOS).includes(estado)) throw new Error(`Estado inválido: "${estado}"`);
    return reservas.filter((r) => r.estado === estado);
  }

  /** Reservas de un día puntual, ordenadas por hora de inicio. */
  function obtenerReservasDelDia(reservas, fecha) {
    validarLista(reservas);
    return ordenarReservasPorFecha(reservas.filter((r) => r.fecha === fecha), 'asc');
  }

  /** Reservas entre dos fechas (ambas inclusive), ordenadas. */
  function obtenerReservasDelPeriodo(reservas, desde, hasta) {
    validarLista(reservas);
    return ordenarReservasPorFecha(reservas.filter((r) => r.fecha >= desde && r.fecha <= hasta), 'asc');
  }

  /** Una reserva ocupa su franja horaria mientras no esté cancelada. */
  function ocupaFranja(reserva) {
    return reserva.estado !== ESTADOS.CANCELADA;
  }

  /** M05-R02F: ¿se puede cancelar la reserva? Solo Confirmada o Reagendada. */
  function puedeCancelarse(reserva) {
    return Boolean(reserva) && ESTADOS_CANCELABLES.includes(reserva.estado);
  }

  /**
   * M05-R02F: cancela una reserva. Devuelve { reservas, reserva } con copias nuevas
   * (la reserva cancelada queda con estado "Cancelada" y, por no ocupar franja, su horario se libera).
   */
  function cancelarReserva(reservas, id) {
    validarLista(reservas);
    const original = reservas.find((r) => r.id === id);
    if (!original) throw new Error(`No existe la reserva "${id}"`);
    if (!puedeCancelarse(original)) {
      throw new Error(`No se puede cancelar una reserva en estado "${original.estado}"`);
    }
    const cancelada = { ...original, estado: ESTADOS.CANCELADA };
    return {
      reservas: reservas.map((r) => (r.id === id ? cancelada : r)),
      reserva: cancelada,
    };
  }

  return {
    ESTADOS,
    ESTADOS_CANCELABLES,
    MESES,
    DIAS_SEMANA,
    formatearFecha,
    parsearFecha,
    horaAMinutos,
    duracionEnMinutos,
    inicioDeSemana,
    diasDeSemana,
    grillaDelMes,
    moverPeriodo,
    tituloPeriodo,
    formatearFechaLarga,
    ordenarReservasPorFecha,
    filtrarReservasPorEstado,
    obtenerReservasDelDia,
    obtenerReservasDelPeriodo,
    ocupaFranja,
    puedeCancelarse,
    cancelarReserva,
  };
});
