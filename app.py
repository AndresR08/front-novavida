import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, g
from flask_cors import CORS

DB_PATH = os.path.abspath(os.getenv("DB_PATH", "database.db"))

app = Flask(__name__)
CORS(app)

# ------------ Helpers DB ------------
def get_db():
    db = g.get("db")
    if db is None:
        db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
        g.db = db
    return db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db:
        db.close()

def check_admin(doc):
    if not doc:
        return False
    db = get_db()
    row = db.execute("SELECT rol FROM usuarios WHERE documento = ?", (doc,)).fetchone()
    return bool(row and row["rol"] == "admin")

def hora_valida(hora):
    """Convierte hora 'HH:MM' a minutos desde medianoche para comparar fácilmente"""
    h, m = map(int, hora.split(":"))
    return h*60 + m

# ------------ RUTAS ------------
@app.get("/api/health")
def health():
    return {"status": "ok", "db": DB_PATH}

# --- LOGIN ---
@app.post("/api/login")
def login():
    data = request.get_json() or {}
    documento = (data.get("documento") or "").strip()
    fecha = (data.get("fecha_nacimiento") or "").strip()

    if not documento or not fecha:
        return jsonify({"error": "Documento y fecha requeridos"}), 400

    # Normalizar fecha
    try:
        if "/" in fecha:
            fecha_norm = datetime.strptime(fecha, "%d/%m/%Y").strftime("%Y-%m-%d")
        else:
            fecha_norm = datetime.strptime(fecha, "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return jsonify({"error": "Formato de fecha inválido"}), 400

    db = get_db()
    row = db.execute(
        "SELECT documento, nombre, rol FROM usuarios WHERE documento = ? AND fecha_nacimiento = ?",
        (documento, fecha_norm)
    ).fetchone()
    if not row:
        return jsonify({"error": "Credenciales inválidas"}), 401

    return jsonify({"documento": row["documento"], "nombre": row["nombre"], "rol": row["rol"]})

# --- Admin: CRUD sedes ---
@app.post("/api/admin/sedes")
def admin_crear_sede():
    admin_doc = request.headers.get("X-User")
    if not check_admin(admin_doc):
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    nombre = data.get("nombre")
    direccion = data.get("direccion", "")
    if not nombre:
        return jsonify({"error": "nombre requerido"}), 400
    db = get_db()
    cur = db.execute("INSERT INTO sedes (nombre, direccion) VALUES (?, ?)", (nombre, direccion))
    db.commit()
    return jsonify({"id": cur.lastrowid, "nombre": nombre, "direccion": direccion})

@app.get("/api/sedes")
def listar_sedes():
    db = get_db()
    rows = db.execute("SELECT * FROM sedes").fetchall()
    return jsonify([dict(r) for r in rows])

# --- Admin: CRUD doctores ---
@app.post("/api/admin/doctores")
def admin_crear_doctor():
    admin_doc = request.headers.get("X-User")
    if not check_admin(admin_doc):
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    nombre = data.get("nombre")
    especialidad = data.get("especialidad")
    sede_id = data.get("sede_id")
    if not (nombre and especialidad):
        return jsonify({"error": "nombre y especialidad requeridos"}), 400
    db = get_db()
    cur = db.execute("INSERT INTO doctores (nombre, especialidad, sede_id) VALUES (?, ?, ?)",
                     (nombre, especialidad, sede_id))
    db.commit()
    return jsonify({"id": cur.lastrowid, "nombre": nombre, "especialidad": especialidad, "sede_id": sede_id})

@app.get("/api/doctores")
def listar_doctores():
    especialidad = request.args.get("especialidad")
    db = get_db()
    if especialidad:
        rows = db.execute("SELECT * FROM doctores WHERE especialidad = ?", (especialidad,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM doctores").fetchall()
    return jsonify([dict(r) for r in rows])

# --- Admin: disponibilidad CRUD ---
@app.post("/api/admin/disponibilidad")
def admin_crear_disponibilidad():
    admin_doc = request.headers.get("X-User")
    if not check_admin(admin_doc):
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    doctor_id = data.get("doctor_id")
    fecha = data.get("fecha")
    hora_inicio = data.get("hora_inicio")
    hora_fin = data.get("hora_fin")
    if not (doctor_id and fecha and hora_inicio and hora_fin):
        return jsonify({"error": "doctor_id, fecha, hora_inicio y hora_fin requeridos"}), 400
    try:
        datetime.strptime(fecha, "%Y-%m-%d")
    except:
        return jsonify({"error": "fecha debe ser YYYY-MM-DD"}), 400
    db = get_db()
    # Validar doctor existe
    doc = db.execute("SELECT * FROM doctores WHERE id = ?", (doctor_id,)).fetchone()
    if not doc:
        return jsonify({"error": "Doctor no encontrado"}), 404
    cur = db.execute("INSERT INTO disponibilidad (doctor_id, fecha, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)",
                     (doctor_id, fecha, hora_inicio, hora_fin))
    db.commit()
    return jsonify({"id": cur.lastrowid})

@app.get("/api/disponibilidad")
def obtener_disponibilidad():
    doctor_id = request.args.get("doctor_id")
    especialidad = request.args.get("especialidad")
    db = get_db()
    if doctor_id:
        rows = db.execute("SELECT * FROM disponibilidad WHERE doctor_id = ? ORDER BY fecha, hora_inicio", (doctor_id,)).fetchall()
    elif especialidad:
        rows = db.execute("""
            SELECT d.*, dis.fecha, dis.hora_inicio, dis.hora_fin
            FROM doctores d
            JOIN disponibilidad dis ON dis.doctor_id = d.id
            WHERE d.especialidad = ?
            ORDER BY dis.fecha, dis.hora_inicio
        """, (especialidad,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM disponibilidad ORDER BY fecha, hora_inicio").fetchall()
    return jsonify([dict(r) for r in rows])

# --- Paciente: Crear cita ---
@app.post("/api/citas")
def crear_cita():
    data = request.get_json() or {}
    paciente_doc = data.get("paciente_doc") or request.headers.get("X-User")
    doctor_id = data.get("doctor_id")
    fecha = data.get("fecha")
    hora = data.get("hora")
    motivo = data.get("motivo", "")

    if not (paciente_doc and doctor_id and fecha and hora):
        return jsonify({"error": "paciente_doc, doctor_id, fecha y hora requeridos"}), 400

    db = get_db()
    user = db.execute("SELECT * FROM usuarios WHERE documento = ?", (paciente_doc,)).fetchone()
    if not user:
        return jsonify({"error": "Paciente no registrado"}), 400

    franjas = db.execute("""
        SELECT * FROM disponibilidad
        WHERE doctor_id = ? AND fecha = ?
    """, (doctor_id, fecha)).fetchall()

    hora_min = hora_valida(hora)
    disponible = False
    for f in franjas:
        if hora_valida(f["hora_inicio"]) <= hora_min < hora_valida(f["hora_fin"]):
            disponible = True
            break
    if not disponible:
        return jsonify({"error": "No hay disponibilidad para ese doctor en la fecha/hora indicada"}), 400

    conflict = db.execute("SELECT * FROM citas WHERE doctor_id = ? AND fecha = ? AND hora = ?",
                          (doctor_id, fecha, hora)).fetchone()
    if conflict:
        return jsonify({"error": "Esa hora ya está ocupada"}), 400

    cur = db.execute("INSERT INTO citas (paciente_doc, doctor_id, fecha, hora, motivo) VALUES (?, ?, ?, ?, ?)",
                     (paciente_doc, doctor_id, fecha, hora, motivo))
    db.commit()
    return jsonify({"id": cur.lastrowid, "mensaje": "Cita creada"})

# --- Listar citas ---
@app.get("/api/citas")
def listar_citas():
    paciente_doc = request.args.get("paciente_doc") or request.headers.get("X-User")
    doctor_id = request.args.get("doctor_id")
    db = get_db()
    if doctor_id:
        rows = db.execute("SELECT * FROM citas WHERE doctor_id = ? ORDER BY fecha, hora", (doctor_id,)).fetchall()
    elif paciente_doc:
        rows = db.execute("SELECT * FROM citas WHERE paciente_doc = ? ORDER BY fecha, hora", (paciente_doc,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM citas ORDER BY fecha, hora").fetchall()
    return jsonify([dict(r) for r in rows])

# --- Eliminar cita ---
@app.delete("/api/citas/<int:id_cita>")
def eliminar_cita(id_cita):
    usuario = request.headers.get("X-User")
    db = get_db()
    if check_admin(usuario):
        cur = db.execute("DELETE FROM citas WHERE id = ?", (id_cita,))
    else:
        cur = db.execute("DELETE FROM citas WHERE id = ? AND paciente_doc = ?", (id_cita, usuario))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Cita no encontrada o no autorizado"}), 404
    return jsonify({"mensaje": "Cita eliminada"})

if __name__ == "__main__":
    app.run(debug=True)
