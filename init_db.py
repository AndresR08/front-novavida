import sqlite3
import os

DB_PATH = os.path.abspath("database.db")  # tu DB se llama database.db
SQL_FILE = os.path.abspath("init_db.sql")  # tu SQL con tablas y datos

def init_db():
    if not os.path.exists(SQL_FILE):
        print("ERROR: No se encontró init_db.sql")
        return

    # Conectar a la DB (se crea si no existe)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Leer todo el SQL
    with open(SQL_FILE, "r", encoding="utf-8") as f:
        sql_script = f.read()

    # Ejecutar
    cursor.executescript(sql_script)
    conn.commit()
    conn.close()
    print(f"Base de datos inicializada en {DB_PATH}")

if __name__ == "__main__":
    init_db()
