from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.db import Base, SessionLocal, engine
from .core.security import get_password_hash
from .models.user import User
from .routers import auth, hogiadinh, nhankhau, thuphi, user


def create_app() -> FastAPI:
    application = FastAPI(title=settings.app_name)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_prefix = settings.api_prefix
    application.include_router(auth.router, prefix=api_prefix)
    application.include_router(user.router, prefix=api_prefix)
    application.include_router(hogiadinh.router, prefix=api_prefix)
    application.include_router(nhankhau.router, prefix=api_prefix)
    application.include_router(thuphi.router, prefix=api_prefix)

    @application.on_event("startup")
    def startup_event() -> None:  # pragma: no cover - side effect
        Base.metadata.create_all(bind=engine)
        _create_default_admin()

    return application


def _create_default_admin() -> None:
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin is None:
            user = User(
                username="admin",
                full_name="Default Admin",
                role="admin",
                hashed_password=get_password_hash("Admin@123"),
            )
            db.add(user)
            db.commit()
    finally:
        db.close()


app = create_app()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    """Simple readiness probe for deployment targets."""
    return {"status": "ok"}
