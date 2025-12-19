from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import auth
from app.routers.messages import messages
from app.routers.users import router as users_router
from app.routers.stats import router as stats_router
from app.core.database import init_db

app = FastAPI(title="Secure API Starter")

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "http://localhost:8080",
        "https://localhost:8443",
        "http://127.0.0.1:8080",
        "https://127.0.0.1:8443"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(stats_router, prefix="/stats/vulnerabilidades", tags=["vulnerabilities"])
