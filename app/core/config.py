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

settings = Settings()
