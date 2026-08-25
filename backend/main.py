from contextlib import asynccontextmanager
from datetime import date
import os
import shutil
import sys
from pathlib import Path
import re
from typing import Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import Base, DATA_DIR, engine, get_db
from models import Marriage, ParentRelationship, Person, Photo
from schemas import (
    MarriageCreate,
    MarriageResponse,
    ParentRelationshipCreate,
    ParentRelationshipResponse,
    PersonCreate,
    PersonResponse,
    PhotoResponse,
)

CREATOR = "ALASI OLATUNDE"
APP_NAME = "FamilyTree"
VERSION = "2.0.0"

BASE_DIR = Path(__file__).resolve().parent

if getattr(sys, "frozen", False):
    BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", BASE_DIR))
else:
    BUNDLE_DIR = BASE_DIR

UPLOAD_DIR = DATA_DIR / "uploads"
FRONTEND_DIST = BUNDLE_DIR / "static"

MAX_IMAGE_SIZE = 10 * 1024 * 1024

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _safe_original_name(name: Optional[str]) -> str:
    name = Path(name or "family-photo").name
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")
    return name[:255] or "family-photo"


def _build_filename(original_name: str) -> str:
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        extension = ".jpg"

    return f"family_{uuid4().hex}{extension}"


def _file_url(filename: Optional[str]) -> Optional[str]:
    return f"/uploads/{filename}" if filename else None


def _person_payload(person: Person) -> dict:
    return {
        "id": person.id,
        "first_name": person.first_name,
        "last_name": person.last_name,
        "gender": person.gender,
        "date_of_birth": person.date_of_birth,
        "email": person.email,
        "photo_url": _file_url(person.photo_filename),
    }


def _photo_payload(photo: Photo, person: Optional[Person] = None) -> dict:
    return {
        "id": photo.id,
        "filename": photo.filename,
        "original_filename": photo.original_filename,
        "person_id": photo.person_id,
        "title": photo.title,
        "description": photo.description,
        "upload_date": photo.upload_date,
        "url": _file_url(photo.filename),
        "person_name": (
            f"{person.first_name} {person.last_name}".strip()
            if person
            else None
        ),
        "is_profile": bool(
            person and person.photo_filename == photo.filename
        ),
        "creator": CREATOR,
    }


def _remove_file(filename: Optional[str]) -> None:
    if not filename:
        return

    path = UPLOAD_DIR / Path(filename).name

    try:
        path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        return

    try:
        if path.exists() and path.is_file():
            path.unlink()
    except OSError:
        pass


async def _save_image(file: UploadFile) -> tuple[str, str]:
    original_name = _safe_original_name(file.filename)
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image extension. Use JPG, PNG, WEBP or GIF.",
        )

    contents = await file.read(MAX_IMAGE_SIZE + 1)

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image is too large. Maximum size is 10 MB.",
        )

    try:
        from io import BytesIO

        with Image.open(BytesIO(contents)) as image:
            image.verify()

        with Image.open(BytesIO(contents)) as image:
            if image.format not in ALLOWED_FORMATS:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported image format.",
                )

    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    filename = _build_filename(original_name)
    destination = UPLOAD_DIR / filename
    destination.write_bytes(contents)

    return filename, original_name


def _delete_photo_record(db: Session, photo: Photo) -> None:
    _remove_file(photo.filename)
    db.delete(photo)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    Application startup.

    The application creates the database tables if they do not exist.
    No bundled/sample family photos are imported automatically.
    The gallery therefore starts empty for a fresh installation.
    """
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="FamilyTree",
    description=(
        "A complete family genealogy, relationship and photo archive "
        "application."
    ),
    version=VERSION,
    lifespan=lifespan,
)


cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

if not cors_origins:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)

if (FRONTEND_DIST / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST / "assets")),
        name="assets",
    )


@app.get("/api/info")
def api_info():
    return {
        "application": APP_NAME,
        "version": VERSION,
        "creator": CREATOR,
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.query(Person.id).limit(1).all()

        return {
            "status": "healthy",
            "database": "connected",
            "application": APP_NAME,
            "creator": CREATOR,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        )


@app.post("/persons", response_model=PersonResponse)
def create_person(
    person: PersonCreate,
    db: Session = Depends(get_db),
):
    new_person = Person(**person.model_dump())

    db.add(new_person)
    db.commit()
    db.refresh(new_person)

    return _person_payload(new_person)


@app.get("/persons", response_model=list[PersonResponse])
def get_persons(db: Session = Depends(get_db)):
    return [
        _person_payload(person)
        for person in db.query(Person)
        .order_by(
            Person.last_name,
            Person.first_name,
            Person.id,
        )
        .all()
    ]


@app.get("/persons/{person_id}", response_model=PersonResponse)
def get_person(
    person_id: int,
    db: Session = Depends(get_db),
):
    person = db.get(Person, person_id)

    if not person:
        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    return _person_payload(person)


@app.put("/persons/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int,
    person_data: PersonCreate,
    db: Session = Depends(get_db),
):
    person = db.get(Person, person_id)

    if not person:
        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    for field, value in person_data.model_dump().items():
        setattr(person, field, value)

    db.commit()
    db.refresh(person)

    return _person_payload(person)


@app.delete("/persons/{person_id}")
def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
):
    person = db.get(Person, person_id)

    if not person:
        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    photos = (
        db.query(Photo)
        .filter(Photo.person_id == person_id)
        .all()
    )

    for photo in photos:
        _delete_photo_record(db, photo)

    db.query(ParentRelationship).filter(
        or_(
            ParentRelationship.parent_id == person_id,
            ParentRelationship.child_id == person_id,
        )
    ).delete(synchronize_session=False)

    db.query(Marriage).filter(
        or_(
            Marriage.person1_id == person_id,
            Marriage.person2_id == person_id,
        )
    ).delete(synchronize_session=False)

    db.delete(person)
    db.commit()

    return {
        "message": "Person deleted successfully",
        "id": person_id,
        "creator": CREATOR,
    }


@app.post("/persons/{person_id}/photo")
async def upload_profile_photo(
    person_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    person = db.get(Person, person_id)

    if not person:
        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    old_filename = person.photo_filename
    filename = None

    try:
        filename, original_name = await _save_image(file)

        old_photo = (
            db.query(Photo)
            .filter(Photo.filename == old_filename)
            .first()
            if old_filename
            else None
        )

        photo = Photo(
            filename=filename,
            original_filename=original_name,
            person_id=person.id,
            title=(
                f"Profile photo — "
                f"{person.first_name} {person.last_name}"
            ),
            description="Member profile photograph.",
            upload_date=date.today(),
        )

        db.add(photo)
        person.photo_filename = filename

        if old_photo:
            _delete_photo_record(db, old_photo)

        db.commit()
        db.refresh(photo)

        return _photo_payload(photo, person)

    except HTTPException:
        if filename:
            _remove_file(filename)
        raise

    except Exception:
        db.rollback()

        if filename:
            _remove_file(filename)

        raise HTTPException(
            status_code=500,
            detail="Unable to save profile photo.",
        )


@app.post(
    "/relationships/parent",
    response_model=ParentRelationshipResponse,
)
def create_parent_relationship(
    relationship: ParentRelationshipCreate,
    db: Session = Depends(get_db),
):
    if not db.get(Person, relationship.parent_id):
        raise HTTPException(
            status_code=404,
            detail="Parent person not found.",
        )

    if not db.get(Person, relationship.child_id):
        raise HTTPException(
            status_code=404,
            detail="Child person not found.",
        )

    existing = (
        db.query(ParentRelationship)
        .filter_by(
            parent_id=relationship.parent_id,
            child_id=relationship.child_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This parent relationship already exists.",
        )

    stack = [relationship.child_id]
    seen = set()

    while stack:
        current = stack.pop()

        if current in seen:
            continue

        seen.add(current)

        if current == relationship.parent_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This link would create a circular family tree."
                ),
            )

        children = (
            db.query(ParentRelationship.child_id)
            .filter(
                ParentRelationship.parent_id == current
            )
            .all()
        )

        stack.extend(
            child_id for (child_id,) in children
        )

    new_relationship = ParentRelationship(
        **relationship.model_dump()
    )

    db.add(new_relationship)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="This parent relationship already exists.",
        )

    db.refresh(new_relationship)

    return new_relationship


@app.get(
    "/relationships/parents",
    response_model=list[ParentRelationshipResponse],
)
def get_parent_relationships(
    db: Session = Depends(get_db),
):
    return (
        db.query(ParentRelationship)
        .order_by(ParentRelationship.id)
        .all()
    )


@app.get(
    "/relationships/parent/{parent_id}",
    response_model=list[ParentRelationshipResponse],
)
def get_children(
    parent_id: int,
    db: Session = Depends(get_db),
):
    if not db.get(Person, parent_id):
        raise HTTPException(
            status_code=404,
            detail="Parent person not found.",
        )

    return (
        db.query(ParentRelationship)
        .filter(
            ParentRelationship.parent_id == parent_id
        )
        .all()
    )


@app.get(
    "/relationships/child/{child_id}",
    response_model=list[ParentRelationshipResponse],
)
def get_parents(
    child_id: int,
    db: Session = Depends(get_db),
):
    if not db.get(Person, child_id):
        raise HTTPException(
            status_code=404,
            detail="Child person not found.",
        )

    return (
        db.query(ParentRelationship)
        .filter(
            ParentRelationship.child_id == child_id
        )
        .all()
    )


@app.delete("/relationships/parent/{relationship_id}")
def delete_parent_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
):
    relationship = db.get(
        ParentRelationship,
        relationship_id,
    )

    if not relationship:
        raise HTTPException(
            status_code=404,
            detail="Parent relationship not found.",
        )

    db.delete(relationship)
    db.commit()

    return {
        "message": "Parent relationship deleted",
        "id": relationship_id,
        "creator": CREATOR,
    }


@app.post(
    "/relationships/marriage",
    response_model=MarriageResponse,
)
def create_marriage(
    marriage: MarriageCreate,
    db: Session = Depends(get_db),
):
    if not db.get(Person, marriage.person1_id):
        raise HTTPException(
            status_code=404,
            detail="First person not found.",
        )

    if not db.get(Person, marriage.person2_id):
        raise HTTPException(
            status_code=404,
            detail="Second person not found.",
        )

    existing = (
        db.query(Marriage)
        .filter(
            or_(
                (
                    (Marriage.person1_id == marriage.person1_id)
                    & (
                        Marriage.person2_id
                        == marriage.person2_id
                    )
                ),
                (
                    (Marriage.person1_id == marriage.person2_id)
                    & (
                        Marriage.person2_id
                        == marriage.person1_id
                    )
                ),
            )
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                "A marriage between these two people "
                "already exists."
            ),
        )

    record = Marriage(**marriage.model_dump())

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@app.get(
    "/relationships/marriages",
    response_model=list[MarriageResponse],
)
def get_marriages(db: Session = Depends(get_db)):
    return (
        db.query(Marriage)
        .order_by(Marriage.id)
        .all()
    )


@app.get(
    "/relationships/marriage/{person_id}",
    response_model=list[MarriageResponse],
)
def get_person_marriages(
    person_id: int,
    db: Session = Depends(get_db),
):
    if not db.get(Person, person_id):
        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    return (
        db.query(Marriage)
        .filter(
            or_(
                Marriage.person1_id == person_id,
                Marriage.person2_id == person_id,
            )
        )
        .all()
    )


@app.delete("/relationships/marriage/{marriage_id}")
def delete_marriage(
    marriage_id: int,
    db: Session = Depends(get_db),
):
    marriage = db.get(Marriage, marriage_id)

    if not marriage:
        raise HTTPException(
            status_code=404,
            detail="Marriage not found.",
        )

    db.delete(marriage)
    db.commit()

    return {
        "message": "Marriage deleted",
        "id": marriage_id,
        "creator": CREATOR,
    }


@app.get("/family-tree")
def get_family_tree(db: Session = Depends(get_db)):
    persons = (
        db.query(Person)
        .order_by(
            Person.last_name,
            Person.first_name,
            Person.id,
        )
        .all()
    )

    return {
        "persons": [
            _person_payload(person)
            for person in persons
        ],
        "parent_relationships": [
            {
                "id": rel.id,
                "parent_id": rel.parent_id,
                "child_id": rel.child_id,
            }
            for rel in (
                db.query(ParentRelationship)
                .order_by(ParentRelationship.id)
                .all()
            )
        ],
        "marriages": [
            {
                "id": item.id,
                "person1_id": item.person1_id,
                "person2_id": item.person2_id,
                "marriage_date": item.marriage_date,
            }
            for item in (
                db.query(Marriage)
                .order_by(Marriage.id)
                .all()
            )
        ],
        "creator": CREATOR,
    }


@app.post("/gallery/upload", response_model=PhotoResponse)
async def upload_photo(
    file: UploadFile = File(...),
    person_id: Optional[int] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    if person_id is not None and not db.get(Person, person_id):
        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    filename = None

    try:
        filename, original_name = await _save_image(file)

        photo = Photo(
            filename=filename,
            original_filename=original_name,
            person_id=person_id,
            title=(title or "").strip()[:255] or None,
            description=(description or "").strip()[:1000] or None,
            upload_date=date.today(),
        )

        db.add(photo)
        db.commit()
        db.refresh(photo)

        person = (
            db.get(Person, person_id)
            if person_id
            else None
        )

        return _photo_payload(photo, person)

    except HTTPException:
        if filename:
            _remove_file(filename)
        raise

    except Exception:
        db.rollback()

        if filename:
            _remove_file(filename)

        raise HTTPException(
            status_code=500,
            detail="Unable to save gallery image.",
        )


@app.get(
    "/gallery",
    response_model=list[PhotoResponse],
)
def get_gallery(db: Session = Depends(get_db)):
    results = []

    photos = (
        db.query(Photo)
        .order_by(Photo.id.desc())
        .all()
    )

    for photo in photos:

        if not (
            UPLOAD_DIR
            / Path(photo.filename).name
        ).exists():
            continue

        person = (
            db.get(Person, photo.person_id)
            if photo.person_id
            else None
        )

        results.append(
            _photo_payload(photo, person)
        )

    return results


@app.delete("/gallery/{photo_id}")
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
):
    photo = db.get(Photo, photo_id)

    if not photo:
        raise HTTPException(
            status_code=404,
            detail="Photo not found.",
        )

    linked_person = (
        db.get(Person, photo.person_id)
        if photo.person_id
        else None
    )

    if (
        linked_person
        and linked_person.photo_filename == photo.filename
    ):
        linked_person.photo_filename = None

    _delete_photo_record(db, photo)
    db.commit()

    return {
        "message": "Photo deleted successfully",
        "id": photo_id,
        "creator": CREATOR,
    }


@app.get("/", include_in_schema=False)
def home():
    index_file = FRONTEND_DIST / "index.html"

    if index_file.exists():
        return FileResponse(index_file)

    return JSONResponse(
        {
            "message": f"{APP_NAME} API is running",
            "version": VERSION,
            "creator": CREATOR,
        }
    )


@app.get("/{path:path}", include_in_schema=False)
def spa_fallback(path: str):

    if path.startswith(
        (
            "docs",
            "redoc",
            "openapi.json",
            "health",
            "persons",
            "relationships",
            "family-tree",
            "gallery",
            "api",
            "uploads",
            "assets",
        )
    ):
        raise HTTPException(
            status_code=404,
            detail="Resource not found.",
        )

    requested = (
        FRONTEND_DIST / path
    ).resolve()

    try:
        requested.relative_to(
            FRONTEND_DIST.resolve()
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Resource not found.",
        )

    if requested.is_file():
        return FileResponse(requested)

    index_file = FRONTEND_DIST / "index.html"

    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(
        status_code=404,
        detail="Frontend build not found.",
    )