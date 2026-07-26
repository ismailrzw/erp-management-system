# Contributing to PBL Management System

## Git Workflow

1. **Branch naming**: `feature/area-description` (e.g., `feature/backend-group-create`)
2. **Always branch from `develop**`
3. **Open PR against `develop**` when ready
4. **PR must have 1 approval** before merging

## Commit Messages

Use conventional commits:

* `feat(module): add feature`
* `fix(module): fix bug`
* `chore(module): maintenance task`
* `docs(module): documentation update`

## Definition of Done

* Endpoint implemented with role-based guards
* Tested in Postman (success + failure cases)
* PR opened, reviewed, merged
* Postman request saved in `backend/postman/`

## Running the Project

```bash
docker-compose up --build

```

### `backend/app/config.py`

```python
import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/pbl_system')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', 24))

```