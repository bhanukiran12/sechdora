#!/bin/bash

python -m uvicorn server:app --host 0.0.0.0 --port 8080 &
nginx -g "daemon off;"