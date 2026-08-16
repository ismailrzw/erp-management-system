# Contributing to PBL Management System — BNU

## Git Workflow

1. **Branch naming**: `feature/area-description` (e.g., `feature/sprint0-validators`)
2. **Always branch from `develop`**
3. **Open PR against `develop`** when ready
4. **PR must have 1 approval** before merging

## Commit Messages

Use conventional commits:

* `feat(module): add feature`
* `fix(module): fix bug`
* `chore(module): maintenance task`
* `docs(module): documentation update`
* `test(module): unit or integration tests`

## Definition of Done

* Endpoint implemented with `@role_required` guards
* Pytest unit tests written & passing (`pytest tests/ -v`)
* Tested in Postman (success + failure cases)
* PR opened against `develop`, reviewed, and merged

## Running the Project

```bash
# Start all services (MongoDB, Flask Backend, Vite Frontend)
docker-compose up --build
```

### Configuration Snippet (`backend/app/config.py`)

```python
import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://admin:adminpass@mongo:27017/pbl_system?authSource=admin')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
```