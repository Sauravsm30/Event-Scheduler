import sys
import os

# If a repository .env file exists, load it into os.environ (simple loader)
def _load_repo_dotenv():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    env_path = os.path.join(repo_root, ".env")
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        pass

_load_repo_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import List, Optional
import uuid
import datetime
from sqlalchemy.orm import Session

from event_crew.crew import EventCrew
from event_crew.database import SessionLocal, init_db, DBProgram, DBEvent, DBVenue, DBVolunteer, DBSchedule

app = FastAPI(title="Agentic AI Event Scheduler API")

# Initialize DB structures
init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class ProgramBase(BaseModel):
    name: str
    start_date: datetime.date
    end_date: datetime.date
    daily_start_time: Optional[datetime.time] = None
    daily_end_time: Optional[datetime.time] = None
    is_24_hour_event: bool = False
    max_parallel_events: int = 1
    status: str = "PLANNING"

    @model_validator(mode='after')
    def check_24_hour(self):
        if self.is_24_hour_event:
            self.daily_start_time = None
            self.daily_end_time = None
        return self

class Program(ProgramBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    model_config = ConfigDict(from_attributes=True)

class EventBase(BaseModel):
    program_id: Optional[str] = None
    name: str
    duration: int
    expectedParticipants: int
    priority: int
    domain: str
    preferredVenueId: Optional[str] = None

class Event(EventBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_config = ConfigDict(from_attributes=True)

class VenueBase(BaseModel):
    program_id: Optional[str] = None
    name: str
    capacity: int
    facilities: List[str]
    isAvailable: bool = True

class Venue(VenueBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_config = ConfigDict(from_attributes=True)

class VolunteerBase(BaseModel):
    program_id: Optional[str] = None
    name: str
    skills: List[str] = []
    availability: List[str] = []

class Volunteer(VolunteerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_config = ConfigDict(from_attributes=True)

class ScheduleBase(BaseModel):
    program_id: Optional[str] = None
    data: str
    timestamp: str

class Schedule(ScheduleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_config = ConfigDict(from_attributes=True)


# Program APIs

@app.post("/api/programs", response_model=Program, tags=["Programs"])
async def create_program(program: ProgramBase, db: Session = Depends(get_db)):
    # Generate unique ID and create
    new_id = str(uuid.uuid4())
    db_program = DBProgram(**program.model_dump(), id=new_id)
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program

@app.get("/api/programs", response_model=List[Program], tags=["Programs"])
async def fetch_programs(db: Session = Depends(get_db)):
    return db.query(DBProgram).all()

@app.get("/api/programs/{id}", response_model=Program, tags=["Programs"])
async def fetch_program(id: str, db: Session = Depends(get_db)):
    db_program = db.query(DBProgram).filter(DBProgram.id == id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    return db_program

@app.put("/api/programs/{id}", response_model=Program, tags=["Programs"])
async def update_program(id: str, program_update: ProgramBase, db: Session = Depends(get_db)):
    db_program = db.query(DBProgram).filter(DBProgram.id == id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    for key, value in program_update.model_dump().items():
        setattr(db_program, key, value)
    db.commit()
    db.refresh(db_program)
    return db_program

@app.delete("/api/programs/{id}", tags=["Programs"])
async def delete_program(id: str, db: Session = Depends(get_db)):
    db_program = db.query(DBProgram).filter(DBProgram.id == id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    db.delete(db_program)
    db.commit()
    return {"message": "Program deleted"}

# Event APIs

@app.post("/api/events", response_model=Event, tags=["Events"])
async def create_event(event: EventBase, db: Session = Depends(get_db)):
    # Generate unique ID and create
    new_id = str(uuid.uuid4())
    db_event = DBEvent(**event.model_dump(), id=new_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.get("/api/events", response_model=List[Event], tags=["Events"])
async def fetch_events(db: Session = Depends(get_db)):
    return db.query(DBEvent).all()

@app.get("/api/events/{id}", response_model=Event, tags=["Events"])
async def fetch_event(id: str, db: Session = Depends(get_db)):
    db_event = db.query(DBEvent).filter(DBEvent.id == id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event

@app.put("/api/events/{id}", response_model=Event, tags=["Events"])
async def update_event(id: str, event_update: EventBase, db: Session = Depends(get_db)):
    db_event = db.query(DBEvent).filter(DBEvent.id == id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    for key, value in event_update.model_dump().items():
        setattr(db_event, key, value)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.delete("/api/events/{id}", tags=["Events"])
async def delete_event(id: str, db: Session = Depends(get_db)):
    db_event = db.query(DBEvent).filter(DBEvent.id == id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted"}

# Venue APIs

@app.post("/api/venues", response_model=Venue, tags=["Venues"])
async def add_venue(venue: VenueBase, db: Session = Depends(get_db)):
    new_id = str(uuid.uuid4())
    db_venue = DBVenue(**venue.model_dump(), id=new_id)
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

@app.get("/api/venues", response_model=List[Venue], tags=["Venues"])
async def fetch_venues(db: Session = Depends(get_db)):
    return db.query(DBVenue).all()

@app.get("/api/venues/{id}", response_model=Venue, tags=["Venues"])
async def fetch_venue(id: str, db: Session = Depends(get_db)):
    db_venue = db.query(DBVenue).filter(DBVenue.id == id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return db_venue

@app.put("/api/venues/{id}/unavailable", response_model=Venue, tags=["Venues"])
async def set_venue_unavailable(id: str, db: Session = Depends(get_db)):
    db_venue = db.query(DBVenue).filter(DBVenue.id == id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    db_venue.isAvailable = False
    db.commit()
    db.refresh(db_venue)
    return db_venue

@app.put("/api/venues/{id}/available", response_model=Venue, tags=["Venues"])
async def set_venue_available(id: str, db: Session = Depends(get_db)):
    db_venue = db.query(DBVenue).filter(DBVenue.id == id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    db_venue.isAvailable = True
    db.commit()
    db.refresh(db_venue)
    return db_venue

# Volunteer APIs

@app.post("/api/volunteers", response_model=Volunteer, tags=["Volunteers"])
async def add_volunteer(volunteer: VolunteerBase, db: Session = Depends(get_db)):
    new_id = str(uuid.uuid4())
    db_volunteer = DBVolunteer(**volunteer.model_dump(), id=new_id)
    db.add(db_volunteer)
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@app.post("/api/volunteers/{id}/availability", response_model=Volunteer, tags=["Volunteers"])
async def submit_availability(id: str, availability: List[str], db: Session = Depends(get_db)):
    db_volunteer = db.query(DBVolunteer).filter(DBVolunteer.id == id).first()
    if not db_volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    db_volunteer.availability = availability
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@app.post("/api/volunteers/{id}/skills", response_model=Volunteer, tags=["Volunteers"])
async def submit_skills(id: str, skills: List[str], db: Session = Depends(get_db)):
    db_volunteer = db.query(DBVolunteer).filter(DBVolunteer.id == id).first()
    if not db_volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    db_volunteer.skills = skills
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@app.get("/api/volunteers/{id}/assignments", tags=["Volunteers"])
async def fetch_assignments(id: str, db: Session = Depends(get_db)):
    # Logic to fetch assignments for volunteer based on schedule
    return {"message": "Logic to fetch assignments for volunteer " + id}

# Scheduling APIs

@app.post("/api/schedule/generate", tags=["Scheduling"])
async def generate_schedule(db: Session = Depends(get_db)):
    # Prepare inputs for Crew
    events = [Event.model_validate(e).model_dump() for e in db.query(DBEvent).all()]
    venues = [Venue.model_validate(v).model_dump() for v in db.query(DBVenue).all()]
    volunteers = [Volunteer.model_validate(vol).model_dump() for vol in db.query(DBVolunteer).all()]
    
    inputs = {
        "events": events,
        "venues": venues,
        "volunteers": volunteers
    }
    
    if not inputs["events"]:
        raise HTTPException(status_code=400, detail="No events to schedule")

    try:
        # Run the crew
        result = EventCrew().crew().kickoff(inputs=inputs)
        
        # Store schedule
        schedule_id = str(uuid.uuid4())
        new_schedule = DBSchedule(
            id=schedule_id,
            data=str(result),
            timestamp=datetime.datetime.now().isoformat()
        )
        db.add(new_schedule)
        
        db.commit()
        db.refresh(new_schedule)
        
        return Schedule.model_validate(new_schedule)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/schedule", response_model=Schedule, tags=["Scheduling"])
async def fetch_current_schedule(db: Session = Depends(get_db)):
    curr_schedule = db.query(DBSchedule).order_by(DBSchedule.timestamp.desc()).first()
    if not curr_schedule:
        raise HTTPException(status_code=404, detail="No schedule generated yet")
    return curr_schedule

@app.get("/api/schedule/{id}", response_model=Schedule, tags=["Scheduling"])
async def fetch_schedule_by_id(id: str, db: Session = Depends(get_db)):
    db_sched = db.query(DBSchedule).filter(DBSchedule.id == id).first()
    if not db_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return db_sched

# Decision Explanation APIs

@app.get("/api/explain/event/{eventId}", tags=["Explanations"])
async def explain_event(eventId: str):
    return {"message": f"Explanation for event {eventId} (AI logic placeholder)"}

@app.get("/api/explain/volunteer/{volunteerId}", tags=["Explanations"])
async def explain_volunteer(volunteerId: str):
    return {"message": f"Explanation for volunteer {volunteerId} (AI logic placeholder)"}

@app.get("/api/explain/schedule/{scheduleId}", tags=["Explanations"])
async def explain_schedule(scheduleId: str):
    return {"message": f"Explanation for schedule {scheduleId} (AI logic placeholder)"}

# Dashboard

@app.get("/api/dashboard/summary", tags=["Dashboard"])
async def dashboard_summary(db: Session = Depends(get_db)):
    total_events = db.query(DBEvent).count()
    total_venues = db.query(DBVenue).count()
    total_volunteers = db.query(DBVolunteer).count()
    last_schedule = db.query(DBSchedule).order_by(DBSchedule.timestamp.desc()).first()
    
    return {
        "total_events": total_events,
        "total_venues": total_venues,
        "total_volunteers": total_volunteers,
        "last_schedule_timestamp": last_schedule.timestamp if last_schedule else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
