// URL base del backend
const BASE_URL = "http://localhost:5000"; // <-- cámbiala por la de tu backend

document.addEventListener("DOMContentLoaded", () => {
    const formAgendar = document.getElementById("form-agendar");

    formAgendar.addEventListener("submit", async(e) => {
        e.preventDefault();

        // Obtener datos del formulario
        const nombre = document.getElementById("nombre").value.trim();
        const fecha = document.getElementById("fecha").value;
        const hora = document.getElementById("hora").value;
        const motivo = document.getElementById("motivo").value.trim();

        if (!nombre || !fecha || !hora || !motivo) {
            alert("Por favor completa todos los campos");
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/citas`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ nombre, fecha, hora, motivo })
            });

            if (!res.ok) {
                throw new Error("Error al agendar la cita");
            }

            const data = await res.json();
            alert("Cita agendada con éxito");
            formAgendar.reset();

        } catch (error) {
            console.error(error);
            alert("No se pudo agendar la cita, intenta de nuevo");
        }
    });
});