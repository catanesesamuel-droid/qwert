#importar clases necesarias de pydantic
class UserRegister(BaseModel):
    username: str
    email: EmailStr #valida que sea un email válido
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3 or len(v) > 50: #debe tener entre 3 y 50 carácteres
            raise ValueError('El usuario tiene que estar entre 3 y 50 carácteres')
        if not v.isalnum(): #o numero o letras
            raise ValueError('El usuario debe ser alfanuérico')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8: #longitud minima de 8 carácteres
            raise ValueError('La contraseña debe tener mínimo 8 carácteres')
        # Puedes añadir más validaciones de complejidad
        return v

class UserLogin(BaseModel): #modelo login del usuario
    username: str
    password: str

class UserResponse(BaseModel): #modelo para que devuelva la info del usuario
    id: int
    username: str
    email: str
    role: str

class Vulnerability(BaseModel): #modelo de vulnerabilidades
    id: int
    name: str #ejemplo de vuln
    description: str #explicación
    severity: str #nivel de gravedad
    created_by: int #id del usuario que la creó
