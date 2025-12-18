# app/core/database.py
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session, select
from contextlib import contextmanager
from app.models.user import User
from app.core.security import get_password_hash

# Ruta absoluta para la base de datos
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent  # app/core → app → raíz
database_dir = project_root / "database"
database_dir.mkdir(exist_ok=True)
database_path = database_dir / "data.db"

DATABASE_URL = f"sqlite:///{database_path}"
print(f" Base de datos: {database_path}")

# Motor de base de datos
engine = create_engine(DATABASE_URL, echo=True)  # echo=True para ver SQL

def init_db():
    """Inicializar base de datos: crear tablas y admin"""
    SQLModel.metadata.create_all(engine)
    create_default_admin()

def create_default_admin():
    """Crear usuario admin por defecto"""
    with Session(engine) as session:
        # Verificar si ya existe admin
        admin = session.exec(select(User).where(User.username == "admin")).first()
        
        if not admin:
            admin_user = User(
                username="admin",
                 email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin_user)
            session.commit()
            print(" Admin creado: usuario='admin', contraseña='admin123'")

@contextmanager
def get_session():
    """Obtener sesión de base de datos"""
    with Session(engine) as session:
        yield session

# Inicializar al importar
init_db()