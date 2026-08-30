from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.api.interfaces import router as interfaces_router


app = FastAPI(
    title="Easy Router",
    description="Network management and discovery API",
    version="0.1.0",
)


app.include_router(
    interfaces_router
)


app.mount(
    "/",
    StaticFiles(
        directory="src/web",
        html=True,
    ),
    name="web",
)
