import os

# HOST must be 0.0.0.0 inside a container. 127.0.0.1 would refuse calls from other containers.
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '8083')}"
workers = int(os.getenv("WORKERS", "2"))
accesslog = "-"
errorlog = "-"
