from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PersonBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    gender: Optional[str] = Field(default=None, max_length=50)

    # Birth information
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = Field(default=None, max_length=255)

    # Death information
    date_of_death: Optional[date] = None
    place_of_death: Optional[str] = Field(default=None, max_length=255)

    # Personal information
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=50)
    occupation: Optional[str] = Field(default=None, max_length=255)
    biography: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonResponse(PersonBase, ORMBaseModel):
    id: int
    photo_url: Optional[str] = None


class ParentRelationshipBase(BaseModel):
    parent_id: int
    child_id: int


class ParentRelationshipCreate(ParentRelationshipBase):
    pass


class ParentRelationshipResponse(
    ParentRelationshipBase,
    ORMBaseModel,
):
    id: int


class MarriageBase(BaseModel):
    person1_id: int
    person2_id: int
    marriage_date: Optional[date] = None


class MarriageCreate(MarriageBase):
    pass


class MarriageResponse(
    MarriageBase,
    ORMBaseModel,
):
    id: int


class PhotoResponse(ORMBaseModel):
    id: int
    filename: str
    original_filename: Optional[str] = None
    person_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    upload_date: date
    url: Optional[str] = None
    person_name: Optional[str] = None
    is_profile: bool = False
    creator: Optional[str] = None


# ============================================================
# AUTHENTICATION SCHEMAS
# ============================================================

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=255)


class UserResponse(ORMBaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    display_name: str
    is_active: bool
    is_super_admin: bool
    avatar_filename: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
