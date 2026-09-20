/**
 * AgendaYA - Módulo 5: Gestión de Agenda (Admin) - Frontend mínimo
 *
 * Flujos implementados:
 *   1. Ver reservas del día  (M05-R01F): calendario semana/mes, detalle de reserva y modal "Reservas del día".
 *   2. Cancelar una reserva  (M05-R02F): botón en el detalle -> confirmación -> estado "Cancelada" + aviso.
 *
 * Los datos viven en memoria: se reinician al recargar la página (no hay backend).
 * La lógica pura (fechas, estados, cancelación) está en ../src/logica-negocio.js (global AgendaLogica).
 */
(function () {
  'use strict';

  const L = window.AgendaLogica;
  const { ESTADOS } = L;

  // Grilla horaria de la vista semana
  const HORA_DESDE = 8;
  const HORA_HASTA = 20; // exclusivo: la última fila es 19:00
  const ALTO_HORA = 64; // px, debe coincidir con --alto-hora en style.css
  const MAX_CHIPS_MES = 2;

  const CLASE_ESTADO = {
    [ESTADOS.CONFIRMADA]: 'estado-confirmada',
    [ESTADOS.PENDIENTE]: 'estado-pendiente',
    [ESTADOS.CANCELADA]: 'estado-cancelada',
    [ESTADOS.REAGENDADA]: 'estado-reagendada',
  };

  // ---------------------------------------------------------------------------
  // Datos de ejemplo (se generan relativos a la semana actual, para que siempre haya reservas visibles)
  // dia: 0 = lunes ... 6 = domingo
  // ---------------------------------------------------------------------------
  const PLANTILLA_SEMANAL = [
    { dia: 1, ini: '09:00', fin: '10:00', invitado: 'Laura Pérez', tipo: 'Reunión equipo', modalidad: 'Presencial', ubicacion: 'Oficina 302', estado: ESTADOS.CONFIRMADA },
    { dia: 1, ini: '10:00', fin: '11:30', invitado: 'María González', tipo: 'Reunión de negocios', modalidad: 'Presencial', ubicacion: 'Oficina 302', estado: ESTADOS.CONFIRMADA },
    { dia: 1, ini: '11:30', fin: '12:30', invitado: 'Miguel Sánchez', tipo: 'Revisión técnica', modalidad: 'Virtual', ubicacion: 'Google Meet', estado: ESTADOS.PENDIENTE },
    { dia: 1, ini: '14:00', fin: '15:00', invitado: 'Carlos Rodríguez', tipo: 'Entrevista', modalidad: 'Presencial', ubicacion: 'Oficina 302', estado: ESTADOS.CONFIRMADA },
    { dia: 1, ini: '16:00', fin: '17:00', invitado: 'Lucía Fernández', tipo: 'Seguimiento de cuenta', modalidad: 'Virtual', ubicacion: 'Zoom', estado: ESTADOS.REAGENDADA },
    { dia: 2, ini: '09:00', fin: '10:30', invitado: 'Ana Martínez', tipo: 'Consultoría', modalidad: 'Presencial', ubicacion: 'Oficina 302', estado: ESTADOS.PENDIENTE },
    { dia: 2, ini: '11:00', fin: '12:00', invitado: 'Claudia Morales', tipo: 'Entrevista candidato', modalidad: 'Virtual', ubicacion: 'Google Meet', estado: ESTADOS.CONFIRMADA },
    { dia: 2, ini: '14:00', fin: '16:00', invitado: 'Fernando Castro', tipo: 'Workshop', modalidad: 'Presencial', ubicacion: 'Sala de capacitación', estado: ESTADOS.CONFIRMADA },
    { dia: 2, ini: '16:30', fin: '17:30', invitado: 'Diego Herrera', tipo: 'Reunión comercial', modalidad: 'Virtual', ubicacion: 'Zoom', estado: ESTADOS.CONFIRMADA },
    { dia: 3, ini: '11:00', fin: '12:00', invitado: 'Patricia López', tipo: 'Revisión de proyecto', modalidad: 'Presencial', ubicacion: 'Oficina 302', estado: ESTADOS.CONFIRMADA },
    { dia: 4, ini: '10:00', fin: '12:00', invitado: 'Jorge Ramírez', tipo: 'Capacitación', modalidad: 'Presencial', ubicacion: 'Sala de capacitación', estado: ESTADOS.CONFIRMADA },
    { dia: 4, ini: '15:00', fin: '16:00', invitado: 'Sandra Torres', tipo: 'Reunión seguimiento', modalidad: 'Virtual', ubicacion: 'Zoom', estado: ESTADOS.CANCELADA },
    { dia: 5, ini: '13:00', fin: '14:30', invitado: 'Roberto Díaz', tipo: 'Presentación de proyecto', modalidad: 'Presencial', ubicacion: 'Oficina 302', estado: ESTADOS.CONFIRMADA },
  ];

  /** IDs resultantes: res-anterior-01, res-actual-01, res-siguiente-01 ... (estables, para usarlos en los tests). */
  function generarReservasDemo(hoy) {
    const lunes = L.inicioDeSemana(hoy);
    const semanas = [['anterior', -1], ['actual', 0], ['siguiente', 1]];
    const reservas = [];
    semanas.forEach(([etiqueta, desplazamiento]) => {
      PLANTILLA_SEMANAL.forEach((t, i) => {
        const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + desplazamiento * 7 + t.dia);
        reservas.push({
          id: `res-${etiqueta}-${String(i + 1).padStart(2, '0')}`,
          invitado: t.invitado,
          tipoEvento: t.tipo,
          fecha: L.formatearFecha(fecha),
          horaInicio: t.ini,
          horaFin: t.fin,
          modalidad: t.modalidad,
          ubicacion: t.ubicacion,
          estado: t.estado,
        });
      });
    });
    return reservas;
  }

  // ---------------------------------------------------------------------------
  // Estado de la pantalla
  // ---------------------------------------------------------------------------
  const estado = {
    vista: 'semana', // M05-R01F: vista por defecto = semana, sin persistir entre sesiones
    fechaRef: new Date(),
    reservas: generarReservasDemo(new Date()),
    seleccionadaId: null,
    diaModal: null, // 'YYYY-MM-DD' cuando el modal "Reservas del día" está abierto
    cancelId: null, // id de la reserva cuyo diálogo de cancelación está abierto
    simularFallaCorreo: false,
    aviso: null, // { tipo: 'ok' | 'warning' | 'error', cy, texto }
  };

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function esc(valor) {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const buscarReserva = (id) => estado.reservas.find((r) => r.id === id) || null;
  const diaCorto = (date) => L.DIAS_SEMANA[date.getDay()].slice(0, 3);

  // ---------------------------------------------------------------------------
  // Render: encabezado
  // ---------------------------------------------------------------------------
  function renderEncabezado() {
    $('calendar-title').textContent = L.tituloPeriodo(estado.vista, estado.fechaRef);
    [['btn-view-week', 'semana'], ['btn-view-month', 'mes']].forEach(([id, vista]) => {
      const activo = estado.vista === vista;
      $(id).classList.toggle('is-active', activo);
      $(id).setAttribute('aria-pressed', String(activo));
    });
  }

  // ---------------------------------------------------------------------------
  // Render: vista semana
  // ---------------------------------------------------------------------------
  function renderSemana() {
    const dias = L.diasDeSemana(estado.fechaRef);
    const hoyStr = L.formatearFecha(new Date());
    const horas = [];
    for (let h = HORA_DESDE; h < HORA_HASTA; h++) horas.push(h);

    const cabecera = dias
      .map((d) => {
        const f = L.formatearFecha(d);
        return `<div class="wh${f === hoyStr ? ' es-hoy' : ''}" data-cy="week-day-${f}">
          <span class="wh-name">${diaCorto(d)}</span><span class="wh-num">${d.getDate()}</span></div>`;
      })
      .join('');

    const columnas = dias
      .map((d) => {
        const f = L.formatearFecha(d);
        const eventos = L.obtenerReservasDelDia(estado.reservas, f)
          .map((r) => {
            const top = ((L.horaAMinutos(r.horaInicio) - HORA_DESDE * 60) / 60) * ALTO_HORA;
            const alto = (L.duracionEnMinutos(r.horaInicio, r.horaFin) / 60) * ALTO_HORA - 2;
            const sel = r.id === estado.seleccionadaId ? ' is-selected' : '';
            return `<button type="button" class="evt ${CLASE_ESTADO[r.estado]}${sel}"
              style="top:${top}px;height:${alto}px"
              data-action="select-booking" data-id="${esc(r.id)}" data-cy="booking-${esc(r.id)}" data-estado="${esc(r.estado)}"
              aria-label="${esc(`${r.invitado}, ${r.tipoEvento}, ${r.horaInicio}, ${r.estado}`)}">
              <span class="evt-name">${esc(r.invitado)}</span>
              <span>${esc(r.tipoEvento)}</span>
              <span>${r.horaInicio}</span>
            </button>`;
          })
          .join('');
        return `<div class="daycol" data-cy="week-col-${f}">${eventos}</div>`;
      })
      .join('');

    const etiquetasHora = horas
      .map((h) => `<div class="hour-label">${String(h).padStart(2, '0')}:00</div>`)
      .join('');

    return `<div class="week" data-cy="calendar-week">
      <div class="week-head"><div></div>${cabecera}</div>
      <div class="week-body"><div class="hours">${etiquetasHora}</div>${columnas}</div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Render: vista mes
  // ---------------------------------------------------------------------------
  function renderMes() {
    const hoyStr = L.formatearFecha(new Date());
    const semanas = L.grillaDelMes(estado.fechaRef);
    const encabezado = semanas[0]
      .map((c) => `<div>${diaCorto(L.parsearFecha(c.fecha))}</div>`)
      .join('');

    const celdas = semanas
      .flat()
      .map((c) => {
        const delDia = L.obtenerReservasDelDia(estado.reservas, c.fecha);
        const num = L.parsearFecha(c.fecha).getDate();
        const chips = delDia
          .slice(0, MAX_CHIPS_MES)
          .map((r) => {
            const sel = r.id === estado.seleccionadaId ? ' is-selected' : '';
            return `<button type="button" class="chip ${CLASE_ESTADO[r.estado]}${sel}"
              data-action="select-booking" data-id="${esc(r.id)}" data-cy="booking-${esc(r.id)}" data-estado="${esc(r.estado)}"
              aria-label="${esc(`${r.invitado}, ${r.tipoEvento}, ${r.horaInicio}, ${r.estado}`)}">
              <span>${r.horaInicio}</span><span>${esc(r.invitado)}</span>
            </button>`;
          })
          .join('');
        const contador = delDia.length
          ? `<span class="cell-count" data-cy="day-count-${c.fecha}">${delDia.length}</span>`
          : '';
        const clases = ['cell', c.delMes ? '' : 'fuera-del-mes', c.fecha === hoyStr ? 'es-hoy' : '']
          .filter(Boolean)
          .join(' ');
        // Clic en el fondo de la celda o en el botón del número abre "Reservas del día";
        // clic en una reserva (chip) abre su detalle. El botón es el punto de acceso por teclado.
        return `<div class="${clases}" data-action="open-day" data-fecha="${c.fecha}" data-cy="day-cell-${c.fecha}">
          <button type="button" class="cell-top" data-action="open-day" data-fecha="${c.fecha}" data-cy="day-open-${c.fecha}"
            aria-label="Ver reservas del ${esc(L.formatearFechaLarga(c.fecha))}">
            <span class="cell-num">${num}</span>${contador}
          </button>${chips}
        </div>`;
      })
      .join('');

    return `<div class="month" data-cy="calendar-month">
      <div class="month-head">${encabezado}</div>
      <div class="month-grid">${celdas}</div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Render: calendario + mensaje de período vacío
  // ---------------------------------------------------------------------------
  function rangoVisible() {
    if (estado.vista === 'semana') {
      const dias = L.diasDeSemana(estado.fechaRef);
      return [L.formatearFecha(dias[0]), L.formatearFecha(dias[6])];
    }
    const semanas = L.grillaDelMes(estado.fechaRef);
    return [semanas[0][0].fecha, semanas[semanas.length - 1][6].fecha];
  }

  function renderCalendario() {
    const cont = $('calendar');
    // Se conserva el scroll al re-renderizar, salvo que cambie la vista (semana <-> mes).
    const scroll = cont.dataset.vista === estado.vista ? cont.scrollTop : 0;
    cont.innerHTML = estado.vista === 'semana' ? renderSemana() : renderMes();
    cont.dataset.vista = estado.vista;
    cont.scrollTop = scroll;

    const [desde, hasta] = rangoVisible();
    const hayReservas = L.obtenerReservasDelPeriodo(estado.reservas, desde, hasta).length > 0;
    $('empty-slot').innerHTML = hayReservas
      ? ''
      : `<div class="notice" role="status" data-cy="empty-period-message">No hay reservas en este período.</div>`;
  }

  // ---------------------------------------------------------------------------
  // Render: panel de detalle (M05-R01F / M05-R02F)
  // ---------------------------------------------------------------------------
  function renderDetalle() {
    const panel = $('detail');
    const r = buscarReserva(estado.seleccionadaId);
    if (!r) {
      panel.innerHTML = `<div class="detail-empty" data-cy="detail-placeholder">Selecciona una reserva para ver los detalles</div>`;
      return;
    }
    const cancelable = L.puedeCancelarse(r);
    panel.innerHTML = `
      <div class="detail-head">
        <h2>Detalle de Reserva</h2>
        <button type="button" class="icon-btn" data-action="close-detail" data-cy="detail-close" aria-label="Cerrar detalle">&#10005;</button>
      </div>
      <div class="detail-body">
        <dl>
          <dt>Invitado</dt><dd data-cy="detail-invitado">${esc(r.invitado)}</dd>
          <dt>Tipo de evento</dt><dd data-cy="detail-tipo-evento">${esc(r.tipoEvento)}</dd>
          <dt>Fecha</dt><dd data-cy="detail-fecha">${esc(L.formatearFechaLarga(r.fecha))}</dd>
          <dt>Horario</dt><dd class="accent" data-cy="detail-horario">${r.horaInicio} - ${r.horaFin}</dd>
          <dt>Modalidad</dt><dd><span class="pill modalidad-${r.modalidad.toLowerCase()}" data-cy="detail-modalidad">${esc(r.modalidad)}</span></dd>
          <dt>Ubicación</dt><dd data-cy="detail-ubicacion">${esc(r.ubicacion)}</dd>
          <dt>Estado</dt><dd><span class="pill ${CLASE_ESTADO[r.estado]}" data-cy="detail-estado">${esc(r.estado)}</span></dd>
        </dl>
      </div>
      <div class="detail-actions">
        <button type="button" class="btn danger" data-action="ask-cancel" data-cy="cancel-booking-btn" ${cancelable ? '' : 'disabled'}>Cancelar reserva</button>
        ${cancelable ? '' : `<p class="hint" data-cy="cancel-disabled-hint">Solo se pueden cancelar reservas Confirmadas o Reagendadas.</p>`}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Render: modales (Reservas del día y confirmación de cancelación) y aviso
  // ---------------------------------------------------------------------------
  function renderModales() {
    let html = '';

    if (estado.diaModal) {
      const delDia = L.obtenerReservasDelDia(estado.reservas, estado.diaModal);
      const items = delDia.length
        ? delDia
            .map(
              (r) => `<button type="button" class="day-item ${CLASE_ESTADO[r.estado]}"
                data-action="select-booking" data-id="${esc(r.id)}" data-cy="day-booking-${esc(r.id)}" data-estado="${esc(r.estado)}">
                <div class="di-top"><span class="di-time">${r.horaInicio} - ${r.horaFin}</span><span class="di-estado">${esc(r.estado)}</span></div>
                <div class="di-name">${esc(r.invitado)}</div>
                <div class="di-type">${esc(r.tipoEvento)}</div>
              </button>`
            )
            .join('')
        : `<div class="modal-empty" data-cy="day-modal-empty">No hay reservas para este día.</div>`;
      html += `<div class="overlay" data-action="overlay-day" data-cy="day-modal-overlay">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="day-modal-title" data-cy="day-modal">
          <div class="modal-head">
            <div>
              <h2 id="day-modal-title" data-cy="day-modal-title">Reservas del día</h2>
              <p data-cy="day-modal-date">${esc(L.formatearFechaLarga(estado.diaModal))}</p>
            </div>
            <button type="button" class="icon-btn" data-action="close-day" data-cy="day-modal-close" aria-label="Cerrar">&#10005;</button>
          </div>
          <div class="modal-body">${items}</div>
        </div>
      </div>`;
    }

    const aCancelar = buscarReserva(estado.cancelId);
    if (aCancelar) {
      html += `<div class="overlay" data-action="overlay-cancel" data-cy="cancel-dialog-overlay">
        <div class="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="cancel-dialog-title" data-cy="cancel-dialog">
          <div class="dialog-body">
            <h2 id="cancel-dialog-title">Cancelar reserva</h2>
            <p data-cy="cancel-dialog-text">¿Confirmas la cancelación de la reserva de <strong>${esc(aCancelar.invitado)}</strong>
              del ${esc(L.formatearFechaLarga(aCancelar.fecha))} a las ${aCancelar.horaInicio}?
              Se liberará el horario y se avisará por correo al invitado y al administrador.</p>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn" data-action="abort-cancel" data-cy="abort-cancel-btn">No, volver</button>
            <button type="button" class="btn danger" data-action="confirm-cancel" data-cy="confirm-cancel-btn">Sí, cancelar reserva</button>
          </div>
        </div>
      </div>`;
    }

    $('modal-root').innerHTML = html;
  }

  function renderAviso() {
    const slot = $('banner-slot');
    if (!estado.aviso) {
      slot.innerHTML = '';
      return;
    }
    const { tipo, cy, texto } = estado.aviso;
    slot.innerHTML = `<div class="banner ${tipo}" role="${tipo === 'ok' ? 'status' : 'alert'}" data-cy="${cy}">
      <span>${esc(texto)}</span>
      <button type="button" class="banner-close" data-action="close-banner" data-cy="banner-close" aria-label="Cerrar aviso">&#10005;</button>
    </div>`;
  }

  /** Re-renderiza todo y cuida el foco (para poder operar con teclado). */
  function render() {
    const focoPrevio = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.cy : null;
    const habiaDialogo = Boolean($('modal-root').querySelector('[data-cy="cancel-dialog"]'));
    const habiaModalDia = Boolean($('modal-root').querySelector('[data-cy="day-modal"]'));

    renderEncabezado();
    renderCalendario();
    renderDetalle();
    renderModales();
    renderAviso();

    const dialogo = $('modal-root').querySelector('[data-cy="abort-cancel-btn"]');
    const modalDia = $('modal-root').querySelector('[data-cy="day-modal-close"]');
    if (dialogo && !habiaDialogo) dialogo.focus();
    else if (modalDia && !habiaModalDia && !dialogo) modalDia.focus();
    else if (focoPrevio) {
      const el = document.querySelector(`[data-cy="${focoPrevio}"]`);
      if (el) el.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  function confirmarCancelacion() {
    const id = estado.cancelId;
    estado.cancelId = null;
    try {
      const { reservas, reserva } = L.cancelarReserva(estado.reservas, id);
      estado.reservas = reservas;
      // M05-R02F: si falla el servicio de correo (M06), la cancelación se efectúa igual y se advierte al administrador.
      estado.aviso = estado.simularFallaCorreo
        ? {
            tipo: 'warning',
            cy: 'cancel-mail-error',
            texto: `La reserva de ${reserva.invitado} fue cancelada, pero no se pudieron enviar los correos de notificación. Avisa al invitado por otro medio.`,
          }
        : {
            tipo: 'ok',
            cy: 'cancel-success-message',
            texto: `La reserva de ${reserva.invitado} fue cancelada. El horario quedó libre y se notificó al invitado y al administrador.`,
          };
    } catch (err) {
      estado.aviso = { tipo: 'error', cy: 'cancel-error-message', texto: `No se pudo cancelar la reserva: ${err.message}` };
    }
  }

  const ACCIONES = {
    'nav-prev': () => { estado.fechaRef = L.moverPeriodo(estado.vista, estado.fechaRef, -1); },
    'nav-next': () => { estado.fechaRef = L.moverPeriodo(estado.vista, estado.fechaRef, 1); },
    'nav-today': () => { estado.fechaRef = new Date(); },
    'view-week': () => { estado.vista = 'semana'; },
    'view-month': () => { estado.vista = 'mes'; },
    'select-booking': (el) => {
      estado.seleccionadaId = el.dataset.id;
      estado.diaModal = null;
      estado.aviso = null;
    },
    'close-detail': () => { estado.seleccionadaId = null; },
    'open-day': (el) => { estado.diaModal = el.dataset.fecha; },
    'close-day': () => { estado.diaModal = null; },
    'overlay-day': () => { estado.diaModal = null; },
    'ask-cancel': () => {
      if (L.puedeCancelarse(buscarReserva(estado.seleccionadaId))) estado.cancelId = estado.seleccionadaId;
    },
    'abort-cancel': () => { estado.cancelId = null; },
    'overlay-cancel': () => { estado.cancelId = null; },
    'confirm-cancel': confirmarCancelacion,
    'close-banner': () => { estado.aviso = null; },
    'reset-data': () => {
      estado.vista = 'semana';
      estado.fechaRef = new Date();
      estado.reservas = generarReservasDemo(new Date());
      estado.seleccionadaId = null;
      estado.diaModal = null;
      estado.cancelId = null;
      estado.aviso = null;
      estado.simularFallaCorreo = false;
      $('sim-mail-failure').checked = false;
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const accion = el.dataset.action;
    // Los overlays solo cierran si se hace clic en el fondo, no dentro del modal.
    if (accion.startsWith('overlay-') && e.target !== el) return;
    if (ACCIONES[accion]) {
      ACCIONES[accion](el);
      render();
    }
  });

  // Escape cierra primero el diálogo de cancelación y, si no hay, el modal del día.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (estado.cancelId) estado.cancelId = null;
    else if (estado.diaModal) estado.diaModal = null;
    else return;
    render();
  });

  $('sim-mail-failure').addEventListener('change', (e) => {
    estado.simularFallaCorreo = e.target.checked;
  });

  render();
})();
