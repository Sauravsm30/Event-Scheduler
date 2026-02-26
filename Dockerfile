FROM python:3.11-slim

# Install system dependencies required for MySQL and uv
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies using standard pip
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn "crewai[tools]<1.0.0" passlib[bcrypt] pyjwt "pymysql>=1.1.2" "python-jose[cryptography]" python-multipart "sqlalchemy>=2.0.46" python-dotenv

# Copy application source code
COPY ./src /app/src
COPY .env /app/.env

# Expose port
EXPOSE 8000

# Run the FastAPI application
CMD ["uvicorn", "src.event_crew.api:app", "--host", "0.0.0.0", "--port", "8000"]
