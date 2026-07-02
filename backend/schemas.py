from datetime import date as date_type, datetime
from pydantic import BaseModel, field_validator


class DoctorBase(BaseModel):
    name: str
    specialization: str
    consultation_fee: float


class DoctorOut(DoctorBase):
    id: int

    class Config:
        from_attributes = True


class AppointmentCreate(BaseModel):
    patient_name: str
    doctor_id: int
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM

    @field_validator("patient_name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Patient name must be at least 2 characters long")
        if not all(ch.isalpha() or ch.isspace() or ch in ".'-" for ch in v):
            raise ValueError("Patient name contains invalid characters")
        return v

    @field_validator("appointment_date")
    @classmethod
    def date_not_in_past(cls, v: str) -> str:
        try:
            parsed = datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format")
        if parsed < date_type.today():
            raise ValueError("Appointment date cannot be in the past")
        return v

    @field_validator("appointment_time")
    @classmethod
    def valid_time_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError("Time must be in HH:MM 24-hour format")
        return v


class AppointmentOut(BaseModel):
    id: int
    patient_name: str
    appointment_date: str
    appointment_time: str
    doctor: DoctorOut

    class Config:
        from_attributes = True
