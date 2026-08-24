# FamilyTree — Production-Ready Family Heritage Archive

**Creator:** ALASI OLATUNDE

FamilyTree is a self-contained family genealogy and photo archive application.

## What is included

- Family member records with validation.
- Profile photograph upload and replacement.
- Parent-child relationships with duplicate and circular-link protection.
- Marriage records with duplicate/self-marriage protection.
- Interactive SVG family tree with vertical/horizontal layouts, zoom and pan.
- Photo gallery with upload preview, tagging, search, filters, lightbox viewing and deletion.
- Automatic registration of image files shipped in `backend/uploads`.
- SQLite database by default — no PostgreSQL configuration is required.
- Production frontend is already bundled into `backend/static` and served by FastAPI.
- Windows and Linux/macOS launch scripts.

## Windows

1. Open the `family_tree_app` folder.
2. Double-click `run.bat`.
3. The launcher creates a local Python environment, installs the pinned backend requirements using prebuilt Windows wheels (so Microsoft C++ Build Tools are not required), starts the server and opens the application.

The application is available at `http://127.0.0.1:8000`.

## Linux / macOS

```bash
chmod +x run.sh
./run.sh
```

## Manual start

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate          # Windows
# source .venv/bin/activate        # Linux/macOS
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Database

The default database is `backend/family_tree.db` (SQLite). You do not need to create a database manually.

For an external database, set `DATABASE_URL` before launching, for example:

```text
DATABASE_URL=postgresql+psycopg://user:password@host:5432/family_tree_db
```

## Image storage

Uploaded images are stored in `backend/uploads`. The application validates the image content, limits uploads to 10 MB, generates safe unique filenames, and removes files when their gallery records are deleted.

## Creator attribution

The application identifies **ALASI OLATUNDE** as its creator in the interface and API metadata.
