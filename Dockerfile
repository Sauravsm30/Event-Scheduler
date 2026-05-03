FROM python:3.11-slim

# Install system dependencies required for MySQL and uv
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation for faster startup
ENV UV_COMPILE_BYTECODE=1

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (creates /app/.venv)
RUN uv sync --frozen --no-install-project --no-dev

# Copy application source code
COPY ./src /app/src
COPY .env /app/.env

# Install the project itself
RUN uv sync --frozen --no-dev

# Place the virtual environment in the PATH
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the FastAPI application
CMD ["uvicorn", "src.event_crew.api:app", "--host", "0.0.0.0", "--port", "8000"]
