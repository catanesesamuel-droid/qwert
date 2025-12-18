from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from app.routers.auth import auth
from app.routers.messages import messages
from app.routers.users import router as users_router
app = FastAPI(title="Secure API Starter")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8001", "http://127.0.0.1:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])  # Cambiado
app.include_router(messages.router, prefix="/messages", tags=["messages"])
