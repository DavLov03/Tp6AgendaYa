# AgendaYA - TP7: Plan de Desarrollo, Mantenimiento y CI/CD

**Grupo 10 · Módulo 05: Gestión de Agenda (Admin)** · Ingeniería y Calidad de Software 2026

Repositorio oficial del Módulo 5 (Gestión de Agenda del Administrador) del sistema **AgendaYA**. Contiene la lógica de negocio pura, la interfaz frontend responsiva, la suite de pruebas unitarias (Jest), la suite de pruebas de integración E2E (Cypress), las herramientas de análisis estático (ESLint y Prettier) y la configuración del pipeline automatizado de Integración Continua en **GitHub Actions** hasta el **Nivel Deseable**.

---

## 1. Plan de Desarrollo y Mantenimiento para Hotfix

El siguiente plan establece el protocolo formal para gestionar cambios correctivos urgentes (**hotfixes**) sobre el ambiente productivo, garantizando que se preserven los estándares de calidad del desarrollo normal aun bajo la presión del SLA.

### 1.1 Gestión del Cambio

- **¿Quién registra, clasifica y autoriza el cambio?**
  - **Registro**: El equipo de Soporte N1/N2 registra el incidente en el gestor de tickets (Jira/GitHub Issues) indicando síntoma, usuarios afectados y logs.
  - **Clasificación**: El **Tech Lead** en conjunto con el **Product Owner (PO)** clasifican el incidente evaluando la severidad.
  - **Criterio de Decision (Hotfix vs. Cambio Ordinario)**:
    - **Hotfix (Urgente)**: Defectos críticos o bloqueantes en producción que afectan el core del negocio (ej. incapacidad de cancelar reservas, pérdida de visibilidad de agenda, caída del servicio). Tienen SLA de resolución urgente ($\le 4$ horas) y se resuelven fuera del ciclo planificado de sprint.
    - **Cambio Ordinario**: Errores menores de interfaz, mejoras cosméticas o fallas no bloqueantes. Se priorizan en el backlog para el siguiente sprint.
  - **Autorización**: Requiere aprobación explícita del Tech Lead para iniciar la rama de hotfix.

### 1.2 Estrategia de Ramas

- **¿Desde qué rama nace el hotfix?**:
  - Nace estrictamente a partir de la rama `main` (que representa el código que está corriendo en producción), nombrando la rama con el patrón `hotfix/INC-XXX-descripcion` (ej. `hotfix/INC-0502-cancelar-reagendada`).
- **¿Hacia dónde se integra?**:
  - Una vez validado y aprobado el hotfix, se integra mediante Pull Requests independientes hacia `main` (para impacto inmediato en producción) y hacia `develop` (para sincronizar la línea base del sprint).
- **¿Cómo se evita que el fix se pierda en la próxima versión?**:
  - El merge obligatorio a `develop` garantiza que las futuras versiones y releases incluyan la corrección. La integración continua (CI) bloquea merges que desincronicen ambas ramas.

### 1.3 Proceso de Revisión

- **¿Quién revisa y cuántas aprobaciones se requieren?**:
  - Requiere **al menos 1 aprobación obligatoria** de un desarrollador peer o Tech Lead que **NO** haya participado en la confección del fix.
- **¿Qué se revisa?**:
  1. Alcance acotado exclusivamente a la solución del incidente.
  2. Presencia de un test automatizado (unitario o E2E) que reproduzca el error (falle antes, pase después).
  3. Ejecución exitosa de todos los checks del pipeline de CI.
- **Plan de contingencia por ausencia (Escalonamiento SLA)**:
  - Si transcurridos 30 minutos desde la apertura del PR no hay un revisor asignado disponible, el incidente se escala automáticamente al **QA Lead / DevSecOps**, quien asume el rol de revisor de emergencia.

### 1.4 Aseguramiento de la Calidad (QA)

- **Pruebas Automatizadas**:
  - **Linter (ESLint)**: Verificación de sintaxis y buenas prácticas.
  - **Formatter (Prettier)**: Verificación de estándares de código.
  - **Unitarias (Jest)**: Ejecución completa de la suite unitaria, incluyendo el test de regresión del incidente.
  - **Integración / E2E (Cypress)**: Verificación en navegador headless de los flujos principales (M05-R01F y M05-R02F).
- **Pruebas Manuales**:
  - Verificación exploratoria rápida en el ambiente de Staging reproduciendo el caso de uso del usuario reportante.
- **Prevención de Regresiones**:
  - El pipeline de CI ejecuta la suite completa de pruebas antes de permitir cualquier merge. Si una funcionalidad previa se rompe, el pipeline se torna rojo y el merge queda bloqueado.

### 1.5 Ambientes

- **Ambiente de Desarrollo / QA**: Utilizado para la construcción y primeras pruebas unitarias del hotfix localmente.
- **Ambiente de Staging / Pre-producción**: Réplica exacta de producción donde se despliega el hotfix para validación de la revisión peer y ejecución de pruebas E2E.
- **Ambiente de Producción**: Servidor en vivo donde impacta el cambio final tras la aprobación del PR a `main`.

### 1.6 Despliegue y Aprobación

- **Despliegue a Producción**:
  - **Mecanismo**: Automatizado vía GitHub Actions al hacer merge en la rama `main`.
  - **Aprobación**: Requiere la aprobación del PR por el Tech Lead. Queda registrado el historial completo de commits, revisiones, timestamps y aprobaciones en GitHub.

### 1.7 Plan de Reversión (Rollback)

- **Procedimiento**:
  - Si el hotfix genera una falla crítica imprevista en producción, se ejecuta un `git revert` del commit de merge en `main` o se redespliega el tag anterior desde GitHub Actions.
- **Tiempo Estimado (RTO)**:
  - El rollback automatizado toma menos de **10 minutos**.

### 1.8 Comunicación y Cierre

- **Notificación**:
  - Una vez desplegado y verificado en producción, se notifica automáticamente vía integración de Slack/Teams y correo a Soporte N1/N2 y al Product Owner.
- **Cierre del Incidente**:
  - Soporte confirma la resolución con el usuario reportante.
  - Se documenta la causa raíz, solución y lecciones aprendidas en el ticket correspondiente de Jira/GitHub Issues y se procede al cierre formal.

---

## 2. Pipeline de Integración Continua (GitHub Actions)

El proyecto cuenta con un workflow automatizado en `.github/workflows/ci.yml` configurado para ejecutarse ante eventos de `push` y `pull_request` sobre las ramas `develop`, `main` y `hotfix/*`.

```
                    ┌─────────────────────────┐
                    │      GitHub Event       │
                    │ Push / PR (main,dev,hf) │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 🔍 Lint & Format │     │ 🧪 Unit Tests   │     │ 🛠️ Build Check  │
│ (ESLint/Prettier│     │     (Jest)      │     │  (Verification) │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 └───────────┬───────────┘
                                             ▼
                                 ┌───────────────────────┐
                                 │ 🌐 Integration E2E    │
                                 │       (Cypress)       │
                                 └───────────────────────┘
```

### 2.1 Cobertura de Requisitos (Niveles Abordados)

#### Nivel Obligatorio

1. **Tests Unitarios**: Ejecución de Jest (`npm test`) verificando que el 100% de los tests pasen (`unit-tests`).
2. **Linter**: Verificación de reglas de calidad y buenas prácticas del lenguaje con ESLint (`npm run lint`).
3. **Formatter**: Verificación de estilos y formateo de código con Prettier (`npm run format:check`).
4. **Build Verification**: Validación del bundle/empaquetado del frontend y scripts (`npm run build`).
5. **Test de Reproducción del Incidente**: Inclusión de al menos un nuevo test automatizado que reproduce la falla reportada (falla antes del fix y pasa después).
6. **Disparo Automatizado**: Configuración de triggers en Pull Requests y Pushes hacia `develop`, `main` y `hotfix/*`.

#### Nivel Deseable

7. **Protección de Ramas**: Configuración documentada de reglas de protección para `develop` y `main` en GitHub, bloqueando el merge hasta que todos los jobs del pipeline finalicen exitosamente.
8. **Tests E2E de Integración (Cypress)**: Job automatizado `e2e-tests` que levanta el servidor web local (`npm start`) en puerto `3000` y ejecuta la suite E2E en modo headless utilizando `cypress-io/github-action@v6`.

---

## 3. Reporte y Solución del Incidente Crítico (INC-0502)

### Ficha del Incidente

- **ID**: `INC-0502`
- **Severidad**: Crítica
- **Módulo**: M05 - Gestión de Agenda (Admin)
- **SLA de Resolución**: 4 Horas
- **Síntoma Reportado**: Administradores reportaron que al intentar cancelar reservas que fueron previamente **Reagendadas**, el sistema rechazaba la operación mostrando el mensaje de error _"No se puede cancelar una reserva en estado Reagendada"_, impidiendo liberar el turno correspondiente.

### Causa Raíz e Inyección del Defecto

En la lógica de negocio (`src/logica-negocio.js`), la función `puedeCancelarse(reserva)` presentaba una restricción en la evaluación del conjunto de estados cancelables (`ESTADOS_CANCELABLES`), impidiendo procesar reservas cuyo estado fuese `L.ESTADOS.REAGENDADA`.

### Test Automatizado de Regresión

Se agregó el siguiente test unitario en `tests/logica-negocio.test.js` para reproducir el defecto y prevenir regresiones futuras:

```js
it('[INC-0502] reproduce incidente: debe permitir cancelar una reserva en estado Reagendada y liberar la franja horaria', () => {
  // Arrange
  const reservas = [
    reserva({
      id: 'inc-reagendada-01',
      invitado: 'Carlos Gómez',
      estado: L.ESTADOS.REAGENDADA,
      fecha: '2026-05-15',
      horaInicio: '14:00',
      horaFin: '15:00',
    }),
  ];

  // Act
  const resultado = L.cancelarReserva(reservas, 'inc-reagendada-01');

  // Assert
  expect(resultado.reserva.estado).toBe(L.ESTADOS.CANCELADA);
  expect(L.ocupaFranja(resultado.reserva)).toBe(false);
  expect(resultado.reservas[0].estado).toBe(L.ESTADOS.CANCELADA);
});
```

### Solución Aplicada

Se actualizó la constante y la función `puedeCancelarse` en `src/logica-negocio.js`:

```js
const ESTADOS_CANCELABLES = Object.freeze([ESTADOS.CONFIRMADA, ESTADOS.REAGENDADA]);

function puedeCancelarse(reserva) {
  return Boolean(reserva) && ESTADOS_CANCELABLES.includes(reserva.estado);
}
```

---

## 4. Guía de Configuración de Protección de Ramas en GitHub

Para dar cumplimiento al punto 7 del **Nivel Deseable**, configure las reglas de protección en el repositorio de GitHub de la siguiente manera:

1. Ingrese al repositorio en GitHub y navegue a **Settings** > **Branches**.
2. Haga clic en **Add branch protection rule**.
3. En **Branch name pattern**, ingrese `main` (y repita luego para `develop`).
4. Active los siguientes checks obligatorios:
   - ✅ **Require a pull request before merging**: Requiere al menos 1 aprobación (Require approvals: 1).
   - ✅ **Require status checks to pass before merging**:
     - Marque **Require branches to be up to date before merging**.
     - En el buscador de Status Checks, agregue los 4 jobs del pipeline:
       - `🔍 Linter & Formatting`
       - `🧪 Unit Tests (Jest)`
       - `🛠️ Build Verification`
       - `🌐 Integration E2E Tests (Cypress)`
   - ✅ **Do not allow bypassing the above settings**: Aplica las reglas también a administradores del repositorio.
5. Guarde los cambios mediante **Save changes**.

---

## 5. Lecciones Aprendidas (Anexo TP1)

| Categoría             | Detalle y Análisis del Equipo                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Qué funcionó**      | - La desacoplamiento de los jobs en GitHub Actions permitió ejecutar verificaciones sintácticas y unitarias en paralelo.<br>- La prueba unitaria de regresión del incidente (INC-0502) garantizó la detección inmediata del fallo antes de aplicar la solución.<br>- Prettier y ESLint automatizaron la homogeneización del código sin fricción en las revisiones. |
| **Qué falló**         | - En la primera ejecución local se detectaron inconsistencias menores de formato en archivos de Cypress.<br>- La sintaxis de encadenamiento de comandos en PowerShell exigió ejecutar instrucciones secuenciales sin `&&`.                                                                                                                                         |
| **Herramientas**      | - **GitHub Actions**: Automatización y orquestación del CI.<br>- **ESLint & Prettier**: Análisis estático y formateo uniforme.<br>- **Jest**: Suite de tests unitarios de lógica pura.<br>- **Cypress**: Automatización E2E de integración sobre navegador headless.                                                                                               |
| **Riesgos**           | - _Riesgo_: Merges directos a `main` sin validación previa.<br>- _Mitigación_: Implementación de reglas de protección de rama y pipeline de CI como requisito previo para merge.                                                                                                                                                                                   |
| **Defectos Técnicos** | - _Defecto_: Bloqueo al intentar cancelar reservas reagendadas (INC-0502).<br>- _Solución_: Modificación de `ESTADOS_CANCELABLES` en `src/logica-negocio.js` para incluir `ESTADOS.REAGENDADA` y liberación automática de la franja horaria.                                                                                                                       |

---

## 6. Instalación y Comandos Locales

### Requisitos Previos

- Node.js 18 o superior
- Git

### Instalación de Dependencias

```bash
npm install
```

### Ejecución de Herramientas de Calidad

```bash
npm run lint          # Linter ESLint
npm run format:check  # Verificación de formato Prettier
npm run format        # Formatear archivos automáticamente
npm run build         # Verificación del build
```

### Ejecución de Pruebas

```bash
npm test              # Tests unitarios con Jest (incluye test INC-0502)
npm start             # Levantar servidor web local en http://localhost:3000
npm run cy:run        # Tests E2E Cypress en modo headless
npm run cy:open       # Tests E2E Cypress en modo interactivo
```

---

## 7. Estructura del Repositorio

```
Tp6AgendaYa/
├── .github/
│   └── workflows/
│       └── ci.yml               # Workflow de Integración Continua (GitHub Actions)
├── cypress/
│   └── e2e/                     # Tests E2E de integración (Cypress)
├── frontend/                    # Aplicación web responsiva (HTML/CSS/JS)
├── src/
│   └── logica-negocio.js        # Lógica de negocio del M05 y gestión de estados
├── tests/
│   └── logica-negocio.test.js   # Suite unitaria Jest con test INC-0502
├── .eslintrc.json               # Configuración de ESLint
├── .prettierrc                  # Configuración de Prettier
├── .prettierignore              # Exclusiones para Prettier
├── cypress.config.js            # Configuración de Cypress
├── package.json                 # Dependencias y scripts del proyecto
└── README.md                    # Documentación general y Plan de Mantenimiento
```
