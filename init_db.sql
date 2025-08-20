-- ----------------------------
-- BASE DE DATOS NOVAVIDA (CORREGIDA CON DATOS DE PRUEBA)
-- ----------------------------

-- Usuarios
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    documento TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    fecha_nacimiento TEXT NOT NULL,
    rol TEXT NOT NULL
);

INSERT INTO usuarios (documento, nombre, fecha_nacimiento, rol) VALUES
('111111', 'Admin User', '1990-01-01', 'admin'),
('222222', 'Paciente User', '2000-05-15', 'paciente'),
('333333', 'Laura Martínez', '1985-07-10', 'paciente'),
('444444', 'Pedro Ramírez', '1992-11-21', 'paciente');

-- Sedes
DROP TABLE IF EXISTS sedes;
CREATE TABLE sedes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT
);

INSERT INTO sedes (nombre, direccion) VALUES
('Sede Central', 'Calle 100 #10-20, Bogotá'),
('Sede Norte', 'Carrera 15 #120-30, Bogotá');

-- Doctores
DROP TABLE IF EXISTS doctores;
CREATE TABLE doctores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    especialidad TEXT NOT NULL,
    sede_id INTEGER,
    FOREIGN KEY (sede_id) REFERENCES sedes(id)
);

INSERT INTO doctores (nombre, especialidad, sede_id) VALUES
('Dr. Juan Pérez', 'Cardiología', 1),
('Dra. María López', 'Pediatría', 1),
('Dr. Carlos Gómez', 'Dermatología', 2),
('Dra. Andrea Torres', 'Medicina General', 2);

-- Disponibilidad
DROP TABLE IF EXISTS disponibilidad;
CREATE TABLE disponibilidad (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctores(id)
);

-- Horarios dentro de jornada laboral normal
INSERT INTO disponibilidad (doctor_id, fecha, hora_inicio, hora_fin) VALUES
-- Dr. Juan Pérez (Cardiología, Sede Central)
(1, '2025-08-14', '08:00', '12:00'),
(1, '2025-08-14', '14:00', '17:00'),
(1, '2025-08-15', '08:00', '12:00'),

-- Dra. María López (Pediatría, Sede Central)
(2, '2025-08-14', '09:00', '13:00'),
(2, '2025-08-15', '09:00', '13:00'),
(2, '2025-08-16', '09:00', '12:00'),

-- Dr. Carlos Gómez (Dermatología, Sede Norte)
(3, '2025-08-14', '10:00', '14:00'),
(3, '2025-08-15', '10:00', '14:00'),

-- Dra. Andrea Torres (Medicina General, Sede Norte)
(4, '2025-08-14', '08:00', '12:00'),
(4, '2025-08-14', '14:00', '18:00'),
(4, '2025-08-15', '08:00', '12:00');

-- Citas (ejemplos para probar)
DROP TABLE IF EXISTS citas;
CREATE TABLE citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_doc TEXT NOT NULL,
    doctor_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    motivo TEXT,
    FOREIGN KEY (paciente_doc) REFERENCES usuarios(documento),
    FOREIGN KEY (doctor_id) REFERENCES doctores(id)
);

INSERT INTO citas (paciente_doc, doctor_id, fecha, hora, motivo) VALUES
('222222', 1, '2025-08-14', '08:30', 'Chequeo general'),
('333333', 2, '2025-08-15', '09:30', 'Control pediátrico'),
('444444', 4, '2025-08-14', '15:00', 'Consulta general');
