from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import API_VERSION, router
from .config import settings

app = FastAPI(title="CardioVista API", version=API_VERSION,
              description="Research/educational prototype. Not a diagnostic device.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"],
                   allow_headers=["*"])

@app.get("/")
def root():
    return {"status": "ok", "service": "CardioVista API", "version": API_VERSION, "docs": "/docs"}

@app.get("/health")
def root_health():
    return {"status": "ok", "service": "CardioVista API"}

app.include_router(router)