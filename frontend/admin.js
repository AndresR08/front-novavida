const API = "http://127.0.0.1:5000/api";
let adminDoc = null;

// Función helper para requests autenticados
async function apiRequest(endpoint, method = "GET", body = null) {
    const headers = { "Content-Type": "application/json", "X-User": adminDoc };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API}${endpoint}`, options);
    const data = await res.json();
    return { ok: res.ok, data };
}

// LOGIN ADMIN
document.getElementById("btn-admin-login").addEventListener("click", async() => {
    const doc = document.getElementById("admin-doc").value.trim();
    const fecha = document.getElementById("admin-fecha").value.trim();
    if (!doc || !fecha) return document.getElementById("admin-msg").textContent = "Complete todos los campos";

    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: doc, fecha_nacimiento: fecha })
    });
    const d = await res.json();
    if (!res.ok) return document.getElementById("admin-msg").textContent = d.error || "Error en login";
    if (d.rol !== "admin") return document.getElementById("admin-msg").textContent = "No es admin";

    adminDoc = d.documento;
    document.getElementById("login").style.display = "none";
    document.getElementById("panel").style.display = "block";
});

// CREAR SEDE
document.getElementById("crear-sede").addEventListener("click", async() => {
    const nombre = document.getElementById("sede-nombre").value.trim();
    const direccion = document.getElementById("sede-dir").value.trim();
    if (!nombre || !direccion) return alert("Complete los campos");

    const { ok, data } = await apiRequest("/admin/sedes", "POST", { nombre, direccion });
    alert(ok ? "Sede creada" : data.error);
});

// CREAR DOCTOR
document.getElementById("crear-doc").addEventListener("click", async() => {
    const nombre = document.getElementById("doc-nombre").value.trim();
    const especialidad = document.getElementById("doc-especialidad").value.trim();
    const sede_id = parseInt(document.getElementById("doc-sedeid").value);
    if (!nombre || !especialidad || isNaN(sede_id)) return alert("Complete todos los campos correctamente");

    const { ok, data } = await apiRequest("/admin/doctores", "POST", { nombre, especialidad, sede_id });
    alert(ok ? "Doctor creado" : data.error);
});

// CREAR DISPONIBILIDAD
document.getElementById("crear-disp").addEventListener("click", async() => {
    const doctor_id = parseInt(document.getElementById("disp-doctor").value);
    const fecha = document.getElementById("disp-fecha").value;
    const hora_inicio = document.getElementById("disp-hi").value;
    const hora_fin = document.getElementById("disp-hf").value;

    if (isNaN(doctor_id) || !fecha || !hora_inicio || !hora_fin) return alert("Complete todos los campos");
    if (hora_fin <= hora_inicio) return alert("La hora final debe ser mayor que la inicial");

    // Aquí podrías consultar si ya existe una disponibilidad en ese horario para ese doctor
    const { ok, data } = await apiRequest("/admin/disponibilidad", "POST", { doctor_id, fecha, hora_inicio, hora_fin });
    alert(ok ? "Disponibilidad creada" : data.error);
});

// VER SEDES
document.getElementById("ver-sedes").addEventListener("click", async() => {
    const { data } = await apiRequest("/sedes");
    document.getElementById("listado").innerText = JSON.stringify(data, null, 2);
});

// VER DOCTORES
document.getElementById("ver-doctores").addEventListener("click", async() => {
    const { data } = await apiRequest("/doctores");
    document.getElementById("listado").innerText = JSON.stringify(data, null, 2);
});