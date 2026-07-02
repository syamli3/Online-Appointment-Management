from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
import schemas
from seed import seed

# Create tables and seed initial doctor data
Base.metadata.create_all(bind=engine)
seed()

app = FastAPI(title="Online Appointment Management Portal")

# Allow the frontend (served from any static origin) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/doctors", response_model=list[schemas.DoctorOut])
def list_doctors(db: Session = Depends(get_db)):
    return db.query(models.Doctor).all()


@app.get("/api/doctors/{doctor_id}", response_model=schemas.DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@app.post("/api/appointments", response_model=schemas.AppointmentOut, status_code=201)
def create_appointment(payload: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor does not exist")

    # Prevent double-booking the same doctor at the same date & time
    clash = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.doctor_id == payload.doctor_id,
            models.Appointment.appointment_date == payload.appointment_date,
            models.Appointment.appointment_time == payload.appointment_time,
        )
        .first()
    )
    if clash:
        raise HTTPException(
            status_code=409,
            detail="This doctor already has an appointment booked at that date and time",
        )

    appointment = models.Appointment(
        patient_name=payload.patient_name,
        doctor_id=payload.doctor_id,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@app.get("/api/appointments", response_model=list[schemas.AppointmentOut])
def list_appointments(db: Session = Depends(get_db)):
    return (
        db.query(models.Appointment)
        .order_by(models.Appointment.appointment_date, models.Appointment.appointment_time)
        .all()
    )


@app.delete("/api/appointments/{appointment_id}", status_code=204)
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return None


# Serve the frontend static files (so the whole app can run from one process)
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")
