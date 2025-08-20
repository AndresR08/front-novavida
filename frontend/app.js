// frontend/app.js (archivo completo corregido)

// URL base del backend
const baseURL = "http://127.0.0.1:5000";

// --- ELEMENTOS del DOM ---
const loginSection = document.getElementById("login");
const agendaSection = document.getElementById("agenda");
const docInput = document.getElementById("doc");
const fechaInput = document.getElementById("fecha_nac");
const loginMsg = document.getElementById("login-msg");
const btnLogin = document.getElementById("btn-login");

const selectEsp = document.getElementById("select-especialidad");
const selectDoc = document.getElementById("select-doctor");
const disponibilidadDiv = document.getElementById("disponibilidad");
const fechaCita = document.getElementById("fecha");
const btnAgendar = document.getElementById("btn-agendar");
const motivoInput = document.getElementById("motivo");
const tbodyCitas = document.getElementById("mis-citas");

// --- ESTADO ---
let usuario = null;
let disponibilidad = []; // lista de franjas {fecha, hora_inicio, hora_fin}
let citas = []; // citas ya agendadas
let fechaSeleccionada = null;
let horaSeleccionada = null;
let calendar = null; // instancia de flatpickr

// -----------------------------
// --- FUNCIONES / LÓGICA ---
// -----------------------------

// --- LOGIN ---
btnLogin.addEventListener("click", async() => {
    const documento = docInput.value.trim();
    const fecha_nac = fechaInput.value;
    loginMsg.textContent = "";

    if (!documento || !fecha_nac) {
        loginMsg.textContent = "Documento y fecha son requeridos";
        return;
    }

    try {
        const res = await fetch(`${baseURL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documento, fecha_nacimiento: fecha_nac })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error login");

        usuario = data;

        // Mostrar agenda
        loginSection.style.display = "none";
        agendaSection.style.display = "block";

        // Cargar datos iniciales
        await cargarEspecialidades();
        await cargarCitas();
    } catch (err) {
        loginMsg.textContent = err.message || "Error en login";
        console.error("Login error:", err);
    }
});

// --- CARGAR ESPECIALIDADES ---
async function cargarEspecialidades() {
    try {
        const res = await fetch(`${baseURL}/api/doctores`);
        if (!res.ok) throw new Error("No se pudo cargar doctores");
        const doctores = await res.json();
        const especialidades = [...new Set(doctores.map(d => d.especialidad))];

        selectEsp.innerHTML = '<option value="">-- elige --</option>';
        especialidades.forEach(e => {
            const opt = document.createElement("option");
            opt.value = e;
            opt.textContent = e;
            selectEsp.appendChild(opt);
        });
    } catch (e) {
        console.error("cargarEspecialidades:", e);
    }
}

// --- CAMBIO DE ESPECIALIDAD ---
selectEsp.addEventListener("change", async() => {
    const esp = selectEsp.value;
    if (!esp) {
        selectDoc.innerHTML = '<option value="">-- elige --</option>';
        return;
    }

    try {
        const res = await fetch(`${baseURL}/api/doctores?especialidad=${encodeURIComponent(esp)}`);
        if (!res.ok) throw new Error("No se pudo cargar doctores por especialidad");
        const docs = await res.json();

        selectDoc.innerHTML = '<option value="">-- elige --</option>';
        docs.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d.id;
            opt.textContent = d.nombre;
            selectDoc.appendChild(opt);
        });

        // limpiar selección de cita previa
        fechaSeleccionada = null;
        horaSeleccionada = null;
        disponibilidadDiv.innerHTML = "";
    } catch (e) {
        console.error("selectEsp change error:", e);
    }
});

// --- CAMBIO DE DOCTOR ---
selectDoc.addEventListener("change", async() => {
    const doctor_id = selectDoc.value;
    if (!doctor_id) return;
    await verificarDisponibilidad();
});

// --- VERIFICAR DISPONIBILIDAD ---
async function verificarDisponibilidad() {
    const doctor_id = selectDoc.value;
    if (!doctor_id) return;

    try {
        const resDisp = await fetch(`${baseURL}/api/disponibilidad?doctor_id=${encodeURIComponent(doctor_id)}`);
        if (!resDisp.ok) throw new Error("Error al obtener disponibilidad");
        disponibilidad = await resDisp.json();

        const resCitas = await fetch(`${baseURL}/api/citas`);
        if (!resCitas.ok) throw new Error("Error al obtener citas");
        citas = (await resCitas.json()).filter(c => String(c.doctor_id) === String(doctor_id));

        // Extraer días únicos
        const dias = [...new Set(disponibilidad.map(f => f.fecha))];
        initCalendar(dias);

        // limpiar selección de hora
        horaSeleccionada = null;
        disponibilidadDiv.innerHTML = "";
    } catch (e) {
        console.error("verificarDisponibilidad:", e);
        disponibilidad = [];
        citas = [];
        initCalendar([]); // resetear calendario si falla
    }
}

// --- INICIALIZAR FLATPICKR (para agenda) ---
function initCalendar(dias) {
    if (!fechaCita) return;

    // destruir instancia previa si existe
    if (calendar && typeof calendar.destroy === "function") {
        try { calendar.destroy(); } catch (e) { /* ignore */ }
        calendar = null;
    }

    // Crear nuevo flatpickr
    try {
        calendar = flatpickr(fechaCita, {
            dateFormat: "Y-m-d",
            minDate: "today",
            maxDate: new Date().fp_incr(60),
            enable: dias && dias.length ? dias : null,
            allowInput: false,
            locale: "es",
            onChange: function(selectedDates, dateStr) {
                fechaSeleccionada = dateStr;
                mostrarHorasDia(dateStr);
            },
            onDayCreate: function(dObj, dStr, instance, dayElem) {
                // dayElem es el elemento DOM del día; dayElem.dateObj tiene la fecha real
                try {
                    const d = dayElem.dateObj;
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    const fechaStr = `${yyyy}-${mm}-${dd}`;
                    if (dias && dias.includes(fechaStr)) {
                        dayElem.classList.add("disponible-flat");
                    }
                } catch (e) {
                    console.warn("onDayCreate error:", e);
                }
            }
        });
    } catch (e) {
        console.error("initCalendar error:", e);
    }
}

// --- MOSTRAR HORAS DEL DÍA ---
function mostrarHorasDia(fecha) {
    disponibilidadDiv.innerHTML = "";
    if (!fecha) return;

    const franjas = disponibilidad.filter(f => f.fecha === fecha);
    if (!franjas.length) {
        disponibilidadDiv.textContent = "No hay horas disponibles";
        return;
    }

    // Crear botones por cada hora en las franjas
    franjas.forEach(f => {
        // hora_inicio y hora_fin esperados como "08:00", "12:00"
        const start = parseInt(f.hora_inicio.split(":")[0], 10);
        const end = parseInt(f.hora_fin.split(":")[0], 10);

        for (let h = start; h < end; h++) {
            const hh = h.toString().padStart(2, "0") + ":00";
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = hh;
            btn.className = "hora-btn";

            // Ver si ya está ocupada en citas
            const ocupada = citas.find(c => c.fecha === fecha && c.hora === hh);
            btn.disabled = !!ocupada;

            // estilos inline básicos (puedes mover a CSS)
            btn.style.margin = "4px";
            btn.style.padding = "6px 10px";
            btn.style.border = "none";
            btn.style.borderRadius = "6px";
            btn.style.cursor = ocupada ? "not-allowed" : "pointer";
            btn.style.backgroundColor = ocupada ? "#f88" : "#22c55e";
            btn.style.color = "white";

            btn.addEventListener("click", () => {
                // desmarcar otros botones
                Array.from(disponibilidadDiv.querySelectorAll("button")).forEach(b => {
                    b.style.outline = "none";
                    b.style.boxShadow = "none";
                });
                // marcar seleccionado
                horaSeleccionada = hh;
                btn.style.outline = "3px solid #00000055";
            });

            disponibilidadDiv.appendChild(btn);
        }
    });
}

// --- AGENDAR CITA ---
btnAgendar.addEventListener("click", async() => {
    if (!usuario) return alert("Inicie sesión primero");
    if (!fechaSeleccionada || !horaSeleccionada) return alert("Seleccione día y hora");

    const doctor_id = selectDoc.value;
    const fecha = fechaSeleccionada;
    const hora = horaSeleccionada;
    const motivo = motivoInput.value || "";

    try {
        const res = await fetch(`${baseURL}/api/citas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paciente_doc: usuario.documento, doctor_id, fecha, hora, motivo })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error || "Error al agendar");

        alert("Cita creada con éxito");
        await cargarCitas();
        await verificarDisponibilidad();
    } catch (e) {
        console.error("agendar error:", e);
        alert("Error al conectar con el servidor");
    }
});

// --- LISTAR CITAS ---
async function cargarCitas() {
    if (!usuario) return;

    try {
        const res = await fetch(`${baseURL}/api/citas?paciente_doc=${encodeURIComponent(usuario.documento)}`);
        if (!res.ok) throw new Error("No se pudieron cargar citas");
        const misCitas = await res.json();

        tbodyCitas.innerHTML = "";
        misCitas.forEach(c => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${c.doctor_id}</td>
                <td>${c.fecha}</td>
                <td>${c.hora}</td>
                <td>${c.estado || "Agendada"}</td>
                <td><button data-id="${c.id}" class="elim-btn">Eliminar</button></td>
            `;
            const btn = tr.querySelector("button");
            btn.addEventListener("click", async() => {
                try {
                    await fetch(`${baseURL}/api/citas/${c.id}`, {
                        method: "DELETE",
                        headers: { "X-User": usuario.documento }
                    });
                    await cargarCitas();
                    await verificarDisponibilidad();
                } catch (e) {
                    console.error("Eliminar cita error:", e);
                }
            });
            tbodyCitas.appendChild(tr);
        });
    } catch (e) {
        console.error("cargarCitas:", e);
    }
}

// -----------------------------
// --- INICIALIZACIÓN INMEDIATA ---
// -----------------------------
// Inicializar Flatpickr para #fecha_nac (login) y un flatpickr básico para #fecha (agenda).
// Esto se ejecuta al cargar el script; si el DOM ya está listo también funcionará.
document.addEventListener("DOMContentLoaded", () => {
    if (typeof flatpickr === "undefined") {
        console.error("Flatpickr no está definido. Revisa que en index.html cargues:");
        console.error("  <script src=\"https://cdn.jsdelivr.net/npm/flatpickr\"></script>");
        console.error("  <script src=\"https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/es.js\"></script>");
        return;
    }

    // Fecha de nacimiento (login) — permite solo fechas <= hoy
    try {
        const elNac = document.querySelector("#fecha_nac");
        if (elNac) {
            flatpickr(elNac, {
                dateFormat: "Y-m-d",
                maxDate: "today",
                locale: "es",
                allowInput: false
            });
        }
    } catch (e) {
        console.warn("No se pudo initializar #fecha_nac", e);
    }

    // Fecha de cita (agenda) — instancia básica; se reconfigura cuando se selecciona doctor
    try {
        const elFecha = document.querySelector("#fecha");
        if (elFecha) {
            // crea un flatpickr "temporal" para abrir calendario, los días habilitados se configuran con initCalendar()
            flatpickr(elFecha, {
                dateFormat: "Y-m-d",
                minDate: "today",
                locale: "es",
                allowInput: false
            });
        }
    } catch (e) {
        console.warn("No se pudo inicializar #fecha", e);
    }
});