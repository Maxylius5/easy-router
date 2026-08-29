from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.api.interface import router as interface_router


app = FastAPI(
    title="Easy Router",
)

app.include_router(interface_router)

app.mount(
    "/",
    StaticFiles(directory="web", html=True),
    name="web",
)