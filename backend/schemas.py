from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class ORMBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        populate_by_name=True,
    )


class PersonBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    gender: Optional[str] = Field(default=None, max_length=50)
    date_of_birth: Optional[date] = None
    email: Optional[EmailStr] = None


class PersonCreate(PersonBase):
    pass


class PersonResponse(PersonBase, ORMBaseModel):
    id: int
    photo_url: Optional[str] = None


class ParentRelationshipCreate(BaseModel):
    parent_id: int = Field(gt=0)
    child_id: int = Field(gt=0)

    @model_validator(mode="after")
    def validate_relationship(self):
        if self.parent_id == self.child_id:
            raise ValueError("A person cannot be their own parent.")
        return self


class ParentRelationshipResponse(ORMBaseModel):
    id: int
    parent_id: int
    child_id: int


class MarriageCreate(BaseModel):
    person1_id: int = Field(gt=0)
    person2_id: int = Field(gt=0)
    marriage_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_marriage(self):
        if self.person1_id == self.person2_id:
            raise ValueError("A person cannot be married to themselves.")
        return self


class MarriageResponse(ORMBaseModel):
    id: int
    person1_id: int
    person2_id: int
    marriage_date: Optional[date] = None


class PhotoResponse(ORMBaseModel):
    id: int
    filename: str
    original_filename: Optional[str] = None
    person_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    upload_date: date
    url: str
    person_name: Optional[str] = None
    is_profile: bool = False
    creator: str = "ALASI OLATUNDE"
