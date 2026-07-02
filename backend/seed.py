from database import SessionLocal, engine, Base
from models import Doctor

Base.metadata.create_all(bind=engine)

DOCTORS = [
    {"name": "Dr. Anjali Mehta", "specialization": "Cardiologist", "consultation_fee": 800.0},
    {"name": "Dr. Rohan Kulkarni", "specialization": "Dermatologist", "consultation_fee": 600.0},
    {"name": "Dr. Sneha Iyer", "specialization": "Pediatrician", "consultation_fee": 500.0},
    {"name": "Dr. Arjun Verma", "specialization": "Orthopedic", "consultation_fee": 900.0},
    {"name": "Dr. Priya Nair", "specialization": "General Physician", "consultation_fee": 400.0},
    {"name": "Dr. Karan Malhotra", "specialization": "ENT Specialist", "consultation_fee": 550.0},
]


def seed():
    db = SessionLocal()
    try:
        if db.query(Doctor).count() == 0:
            for d in DOCTORS:
                db.add(Doctor(**d))
            db.commit()
            print(f"Seeded {len(DOCTORS)} doctors.")
        else:
            print("Doctors already exist, skipping seed.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
