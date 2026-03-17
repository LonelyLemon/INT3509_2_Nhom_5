FROM python:3.13-slim

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency files first
COPY pyproject.toml uv.lock ./

# Install dependencies into the system environment to avoid virtualenv complexities inside Docker
RUN uv pip install --system -r pyproject.toml

# Copy the rest of the application
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini ./
# Note: we are purposefully not copying .env files here since those should be injected 
# via environment variables or docker-compose secrets at runtime.

# Expose port
EXPOSE 8000

# Set entrypoint
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
