from pydantic import BaseModel, Field
from typing import Optional

class ModelBase(BaseModel):
    # Common fields
    model_name: str
    license: str
    window: str

    cost: Optional[float] = None
    latency: Optional[float] = None
    performance: Optional[float] = None

    math_score: Optional[float] = None
    coding_score: Optional[float] = None
    gk_score: Optional[float] = None

    input_cost_raw: Optional[float] = None
    output_cost_raw: Optional[float] = None
    top_p: float
    temperature: float
    io_ratio: float

class ModelCreate(ModelBase):
    """
    All fields required to create a new ModelMetadata.
    """
    pass

class ModelUpdate(BaseModel):
    """
    Fields allowed to be updated.
    """
    model_name: Optional[str] = None
    license: Optional[str] = None
    window: Optional[str] = None

    cost: Optional[float] = None
    latency: Optional[float] = None
    performance: Optional[float] = None

    math_score: Optional[float] = None
    coding_score: Optional[float] = None
    gk_score: Optional[float] = None

    input_cost_raw: Optional[float] = None
    output_cost_raw: Optional[float] = None
    top_p: Optional[float] = None
    temperature: Optional[float] = None
    io_ratio: Optional[float] = None

class ModelInDB(ModelBase):
    """
    Schema for reading a ModelMetadata from the DB.
    Includes the 'id' field.
    """
    id: int

    class Config:
        orm_mode = True
