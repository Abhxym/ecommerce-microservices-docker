# Stage 1: install packages and run the tests
FROM python:3.12-slim AS test
WORKDIR /app
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
RUN pytest -q -p no:cacheprovider

# Stage 2: install only the runtime packages into a separate folder
FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 3: runtime image, runs as a non-root user
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8083
RUN useradd --system --uid 1001 --no-create-home flask
WORKDIR /app
COPY --from=build /install /usr/local
# copying from the test stage means the image is only built when the tests pass
COPY --from=test --chown=flask:flask /app/app.py /app/db.py /app/gunicorn.conf.py ./
USER flask
EXPOSE 8083
# slim image has no curl or wget, so the check uses Python
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8083/health', timeout=2)" || exit 1
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
