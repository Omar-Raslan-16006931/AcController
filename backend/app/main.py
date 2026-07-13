import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import aux, command, fan, history, mode, power, scheduler, settings as settings_router, shortcuts, status, system, temperature
from app.scheduler_worker import run_scheduler_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("ac-controller")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(run_scheduler_loop())
    logger.info("Scheduler/timer background worker started")
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="AcController API",
    description="FastAPI backend running on the Raspberry Pi that drives a Carrier AC over IR.",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Unsupported mode/fan/temperature values (or any other malformed
    # request body) are rejected here with a 400 before ever reaching the
    # CarrierAC/IR layer — FastAPI's default is 422, overridden to 400 per
    # the API contract this app uses for "bad request" errors.
    #
    # Cross-field validators (e.g. CommandRequest's "at least one field"
    # check) raise a plain ValueError, and Pydantic embeds that exception
    # *object* (not a string) in error["ctx"]["error"] -- which json.dumps
    # can't serialize on its own. Stringify it before encoding.
    errors = exc.errors()
    for error in errors:
        ctx = error.get("ctx")
        if ctx and "error" in ctx:
            ctx["error"] = str(ctx["error"])
    return JSONResponse(
        status_code=400,
        content={"detail": jsonable_encoder(errors)},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.include_router(status.router)
app.include_router(power.router)
app.include_router(temperature.router)
app.include_router(mode.router)
app.include_router(fan.router)
app.include_router(command.router)
app.include_router(scheduler.router)
app.include_router(history.router)
app.include_router(settings_router.router)
app.include_router(system.router)
app.include_router(shortcuts.router)
app.include_router(aux.router)


@app.get("/")
def root() -> dict:
    return {"name": "AcController API", "status": "running"}
