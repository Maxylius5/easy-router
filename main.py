from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.api.interfaces import router as interfaces_router
from src.api.config import router as config_router


app = FastAPI(
    title="Easy Router",
    description="Network management and discovery API",
    version="0.1.0",
)


app.include_router(
    interfaces_router
)

app.include_router(
    config_router
)


app.mount(
    "/static",
    StaticFiles(directory="src/web"),
    name="static",
)


@app.get("/")
def index():
    return FileResponse(
        "src/web/index.html"
    )