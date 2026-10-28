# Placeholder multi-stage Dockerfile: build the React frontend, then serve it with the Python backend.
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/ ./
# RUN npm ci && npm run build   (enable once the frontend is added)

FROM python:3.12-slim AS backend
WORKDIR /app
COPY backend/ ./backend/
# RUN pip install --no-cache-dir -r backend/requirements.txt   (enable once dependencies are added)
COPY --from=frontend /app/frontend ./frontend
EXPOSE 8000
CMD ["python", "-c", "print('Scaffold only: backend not implemented yet')"]
