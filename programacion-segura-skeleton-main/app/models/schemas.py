from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    email: EmailStr = Field(...)
class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    email: str
    role: str

class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)

class MessageOut(BaseModel):
    id: int
    content: str
    owner_id: int

    class Config:
        from_attributes = True
