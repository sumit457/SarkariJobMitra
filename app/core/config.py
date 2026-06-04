from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "govjobs"
    ENV: str = "dev"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    DATABASE_URL: str
    REDIS_URL: str

    ADMIN_SEED_EMAIL: str = "admin@example.com"
    ADMIN_SEED_PASSWORD: str = "ChangeThis123!"
    PUBLIC_SITE_PHASE: str = "tools"
    CORS_ORIGINS: str = "http://localhost:3000"
    MAX_UPLOAD_MB: int = 25
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 60
    RATE_LIMIT_WINDOW_SECONDS: int = 3600
    ENABLE_NOTICE_CLASSIFIER: bool = True
    ENABLE_FIELD_CANDIDATES: bool = True
    ENABLE_AUTO_PUBLISH: bool = False
    ENABLE_SOURCE_HEALTH: bool = True

settings = Settings()
