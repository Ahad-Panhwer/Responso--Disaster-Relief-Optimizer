"""
Responso Backend — FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time

from app.core.config import settings
from app.core.database import Base, engine
from app.api.routes import auth, users, locations, requests, warehouses, inventory, allocation, deliveries, dashboard, audit

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("responso")

# Create tables (for SQLite dev; Alembic handles production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Responso API",
    description="Disaster Relief Resource Optimizer — CL-03",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(duration)
    return response


# Exception handlers — format all errors consistently as {"error": {"code": ..., "message": ..., "details": ...}}
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HTTP_ERROR", "message": str(exc.detail), "details": {}}},
    )


from fastapi.encoders import jsonable_encoder


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "VALIDATION_ERROR", "message": "Input validation failed.", "details": {"errors": jsonable_encoder(exc.errors())}}},
    )


# Global exception handler — never expose stack traces to clients
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred.", "details": {}}},
    )


# Health check (no auth required)
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "responso-api", "version": "1.0.0"}


# Mount all routers under /api/v1
PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX + "/auth", tags=["Auth"])
app.include_router(users.router, prefix=PREFIX + "/users", tags=["Users"])
app.include_router(locations.router, prefix=PREFIX + "/locations", tags=["Locations"])
app.include_router(requests.router, prefix=PREFIX + "/requests", tags=["Requests"])
app.include_router(warehouses.router, prefix=PREFIX + "/warehouses", tags=["Warehouses"])
app.include_router(inventory.router, prefix=PREFIX + "/inventory", tags=["Inventory"])
app.include_router(allocation.router, prefix=PREFIX + "/allocation-runs", tags=["Allocation"])
app.include_router(deliveries.router, prefix=PREFIX + "/deliveries", tags=["Deliveries"])
app.include_router(dashboard.router, prefix=PREFIX + "/dashboard", tags=["Dashboard"])
app.include_router(audit.router, prefix=PREFIX + "/audit-events", tags=["Audit"])
