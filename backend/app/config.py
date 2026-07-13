"""应用配置管理。

使用 pydantic-settings 从环境变量和 .env 文件加载配置。
所有配置项有合理的默认值，确保无外部依赖时服务也可启动。
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置。"""

    # 数据库
    DATABASE_URL: str = "sqlite:///./iching.db"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 小时

    # LLM（DeepSeek API）
    LLM_API_KEY: str = ""             # 无 key 时服务能启动，但 LLM 调用会报明确错误
    LLM_API_BASE: str = "https://api.deepseek.com/v1"
    LLM_MODEL: str = "deepseek-v4-flash"

    # 每日免费占卜次数
    FREE_DAILY_LIMIT: int = 3

    # 服务
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    class Config:
        """Pydantic 配置。"""

        env_file = ".env"


settings = Settings()
