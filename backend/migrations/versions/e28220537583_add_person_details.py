"""initial FamilyTree schema

Revision ID: e28220537583
Revises:
Create Date: 2026-09-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e28220537583"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the complete initial FamilyTree database schema."""

    op.create_table(
        "persons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("gender", sa.String(length=50), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("place_of_birth", sa.String(length=255), nullable=True),
        sa.Column("date_of_death", sa.Date(), nullable=True),
        sa.Column("place_of_death", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("occupation", sa.String(length=255), nullable=True),
        sa.Column("biography", sa.Text(), nullable=True),
        sa.Column("photo_filename", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_persons_id",
        "persons",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_persons_name",
        "persons",
        ["last_name", "first_name"],
        unique=False,
    )

    op.create_index(
        "ix_persons_birth_date",
        "persons",
        ["date_of_birth"],
        unique=False,
    )

    op.create_index(
        "ix_persons_death_date",
        "persons",
        ["date_of_death"],
        unique=False,
    )

    op.create_table(
        "parent_relationships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=False),
        sa.Column("child_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["persons.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["persons.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "parent_id",
            "child_id",
            name="uq_parent_child",
        ),
    )

    op.create_index(
        "ix_parent_relationships_id",
        "parent_relationships",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_parent_relationship_parent",
        "parent_relationships",
        ["parent_id"],
        unique=False,
    )

    op.create_index(
        "ix_parent_relationship_child",
        "parent_relationships",
        ["child_id"],
        unique=False,
    )

    op.create_table(
        "marriages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person1_id", sa.Integer(), nullable=False),
        sa.Column("person2_id", sa.Integer(), nullable=False),
        sa.Column("marriage_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(
            ["person1_id"],
            ["persons.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["person2_id"],
            ["persons.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_marriages_id",
        "marriages",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_marriages_person1",
        "marriages",
        ["person1_id"],
        unique=False,
    )

    op.create_index(
        "ix_marriages_person2",
        "marriages",
        ["person2_id"],
        unique=False,
    )

    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("person_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("upload_date", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(
            ["person_id"],
            ["persons.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("filename"),
    )

    op.create_index(
        "ix_photos_id",
        "photos",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_photos_person",
        "photos",
        ["person_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove the complete FamilyTree database schema."""

    op.drop_index("ix_photos_person", table_name="photos")
    op.drop_index("ix_photos_id", table_name="photos")
    op.drop_table("photos")

    op.drop_index("ix_marriages_person2", table_name="marriages")
    op.drop_index("ix_marriages_person1", table_name="marriages")
    op.drop_index("ix_marriages_id", table_name="marriages")
    op.drop_table("marriages")

    op.drop_index(
        "ix_parent_relationship_child",
        table_name="parent_relationships",
    )
    op.drop_index(
        "ix_parent_relationship_parent",
        table_name="parent_relationships",
    )
    op.drop_index(
        "ix_parent_relationships_id",
        table_name="parent_relationships",
    )
    op.drop_table("parent_relationships")

    op.drop_index("ix_persons_death_date", table_name="persons")
    op.drop_index("ix_persons_birth_date", table_name="persons")
    op.drop_index("ix_persons_name", table_name="persons")
    op.drop_index("ix_persons_id", table_name="persons")
    op.drop_table("persons")