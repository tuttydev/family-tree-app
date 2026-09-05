
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)

from database import Base


# ============================================================
# PERSON
# ============================================================

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)

    # Basic identity
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    gender = Column(String(50), nullable=True)

    # Birth information
    date_of_birth = Column(Date, nullable=True)
    place_of_birth = Column(String(255), nullable=True)

    # Death information
    date_of_death = Column(Date, nullable=True)
    place_of_death = Column(String(255), nullable=True)

    # Personal information
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    occupation = Column(String(255), nullable=True)
    biography = Column(Text, nullable=True)

    # Profile photograph
    photo_filename = Column(String(255), nullable=True)

    __table_args__ = (
        Index(
            "ix_persons_name",
            "last_name",
            "first_name",
        ),
        Index(
            "ix_persons_birth_date",
            "date_of_birth",
        ),
        Index(
            "ix_persons_death_date",
            "date_of_death",
        ),
    )


# ============================================================
# PARENT / CHILD RELATIONSHIP
# ============================================================

class ParentRelationship(Base):
    __tablename__ = "parent_relationships"

    id = Column(Integer, primary_key=True, index=True)

    parent_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
    )

    child_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "parent_id",
            "child_id",
            name="uq_parent_child",
        ),
        Index(
            "ix_parent_relationship_parent",
            "parent_id",
        ),
        Index(
            "ix_parent_relationship_child",
            "child_id",
        ),
    )


# ============================================================
# MARRIAGE
# ============================================================

class Marriage(Base):
    __tablename__ = "marriages"

    id = Column(Integer, primary_key=True, index=True)

    person1_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
    )

    person2_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
    )

    marriage_date = Column(Date, nullable=True)

    __table_args__ = (
        Index(
            "ix_marriages_person1",
            "person1_id",
        ),
        Index(
            "ix_marriages_person2",
            "person2_id",
        ),
    )


# ============================================================
# PHOTO / GALLERY
# ============================================================

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(
        String(255),
        nullable=False,
        unique=True,
    )

    original_filename = Column(
        String(255),
        nullable=True,
    )

    person_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="SET NULL"),
        nullable=True,
    )

    title = Column(
        String(255),
        nullable=True,
    )

    description = Column(
        String(500),
        nullable=True,
    )

    upload_date = Column(
        Date,
        nullable=False,
    )

    # Unique photo code
    code = Column(
        String(150),
        nullable=False,
        unique=True,
        index=True,
    )

    __table_args__ = (
        Index(
            "ix_photos_person",
            "person_id",
        ),
    )


# ============================================================
# AUTHENTICATION & AUTHORIZATION
# ============================================================

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column(
        "user_id",
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "role_id",
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column(
        "role_id",
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    email = Column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    display_name = Column(
        String(255),
        nullable=False,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    is_super_admin = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    avatar_filename = Column(
        String(255),
        nullable=True,
    )


# ============================================================
# ROLE
# ============================================================

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(100),
        nullable=False,
        unique=True,
    )

    description = Column(
        String(500),
        nullable=True,
    )

    is_system_role = Column(
        Boolean,
        nullable=False,
        default=False,
    )


# ============================================================
# PERMISSION
# ============================================================

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)

    code = Column(
        String(150),
        nullable=False,
        unique=True,
        index=True,
    )

    description = Column(
        String(500),
        nullable=True,
    )

