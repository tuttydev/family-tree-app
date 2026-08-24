from sqlalchemy import Column, Date, ForeignKey, Index, Integer, String, UniqueConstraint

from database import Base


class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    gender = Column(String(50), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    email = Column(String(255), nullable=True)
    photo_filename = Column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_persons_name", "last_name", "first_name"),
    )


class ParentRelationship(Base):
    __tablename__ = "parent_relationships"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    child_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("parent_id", "child_id", name="uq_parent_child"),
        Index("ix_parent_relationship_parent", "parent_id"),
        Index("ix_parent_relationship_child", "child_id"),
    )


class Marriage(Base):
    __tablename__ = "marriages"

    id = Column(Integer, primary_key=True, index=True)
    person1_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    person2_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    marriage_date = Column(Date, nullable=True)

    __table_args__ = (
        Index("ix_marriages_person1", "person1_id"),
        Index("ix_marriages_person2", "person2_id"),
    )


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False, unique=True)
    original_filename = Column(String(255), nullable=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=True)
    description = Column(String(1000), nullable=True)
    upload_date = Column(Date, nullable=False)

    __table_args__ = (
        Index("ix_photos_person", "person_id"),
    )
