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
                if key:
                    os.environ[key] = val
    except Exception:
        pass

_load_repo_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import List, Optional
import uuid
import datetime
import asyncio
from sqlalchemy.orm import Session

from event_crew.crew import EventCrew
from event_crew.email_service import email_dispatcher
from event_crew.database import SessionLocal, init_db, DBProgram, DBEvent, DBVenue, DBVolunteer, DBSchedule, DBUser, DBProgramUserRole
from event_crew.auth import get_password_hash, verify_password, create_access_token, verify_token

app = FastAPI(title="Agentic AI Event Scheduler API")

# Initialize DB structures
init_db()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    skills: Optional[List[str]] = []

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    skills: Optional[List[str]] = []
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class AddUserToProgram(BaseModel):
    email: str
    role: str

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
    is_approved: bool = False

class ScheduleGenerateRequest(BaseModel):
    human_prompt: Optional[str] = None

class Schedule(ScheduleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_config = ConfigDict(from_attributes=True)

# Auth Dependencies
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def require_organiser_or_committee(program_id: str, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    role_record = db.query(DBProgramUserRole).filter(
        DBProgramUserRole.user_id == current_user.id,
        DBProgramUserRole.program_id == program_id
    ).first()
    
    if not role_record or role_record.role not in ['ORGANISER', 'COMMITTEE']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return role_record

def require_organiser(program_id: str, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    role_record = db.query(DBProgramUserRole).filter(
        DBProgramUserRole.user_id == current_user.id,
        DBProgramUserRole.program_id == program_id
    ).first()
    
    if not role_record or role_record.role != 'ORGANISER':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organiser access required")
    return role_record

# Auth APIs

@app.post("/api/auth/signup", response_model=UserResponse, tags=["Auth"])
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(DBUser).filter(DBUser.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user.password)
    db_user = DBUser(id=new_id, email=user.email, hashed_password=hashed_password, full_name=user.full_name, skills=user.skills)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=Token, tags=["Auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse, tags=["Auth"])
async def read_users_me(current_user: DBUser = Depends(get_current_user)):
    return current_user

class UserSkillsUpdate(BaseModel):
    skills: List[str]

@app.patch("/api/users/me/skills", response_model=UserResponse, tags=["Auth"])
async def update_my_skills(skills_data: UserSkillsUpdate, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    current_user.skills = skills_data.skills
    db.commit()
    db.refresh(current_user)
    return current_user

@app.get("/api/users", response_model=List[UserResponse], tags=["Users"])
async def get_all_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return db.query(DBUser).offset(skip).limit(limit).all()

# Program APIs

@app.post("/api/programs", response_model=Program, tags=["Programs"])
async def create_program(program: ProgramBase, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    # Generate unique ID and create
    new_id = str(uuid.uuid4())
    db_program = DBProgram(**program.model_dump(), id=new_id)
    db.add(db_program)
    
    # Assign calling user as ORGANISER
    role_id = str(uuid.uuid4())
    db_role = DBProgramUserRole(id=role_id, user_id=current_user.id, program_id=new_id, role='ORGANISER')
    db.add(db_role)
    
    db.commit()
    db.refresh(db_program)
    return db_program

@app.get("/api/programs", response_model=List[Program], tags=["Programs"])
async def fetch_programs(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    # Fetch programs the user is a part of
    role_records = db.query(DBProgramUserRole).filter(DBProgramUserRole.user_id == current_user.id).all()
    program_ids = [r.program_id for r in role_records]
    return db.query(DBProgram).filter(DBProgram.id.in_(program_ids)).all()

@app.get("/api/programs/{id}", response_model=Program, tags=["Programs"])
async def fetch_program(id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    # Ensure they have a role in the program to view it
    role_record = db.query(DBProgramUserRole).filter(
        DBProgramUserRole.user_id == current_user.id,
        DBProgramUserRole.program_id == id
    ).first()
    if not role_record:
        raise HTTPException(status_code=403, detail="Access denied")

    db_program = db.query(DBProgram).filter(DBProgram.id == id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    return db_program

@app.put("/api/programs/{id}", response_model=Program, tags=["Programs"])
async def update_program(id: str, program_update: ProgramBase, db: Session = Depends(get_db), role: DBProgramUserRole = Depends(require_organiser)):
    db_program = db.query(DBProgram).filter(DBProgram.id == id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    for key, value in program_update.model_dump().items():
        setattr(db_program, key, value)
    db.commit()
    db.refresh(db_program)
    return db_program

@app.delete("/api/programs/{id}", tags=["Programs"])
async def delete_program(id: str, db: Session = Depends(get_db), role: DBProgramUserRole = Depends(require_organiser)):
    db_program = db.query(DBProgram).filter(DBProgram.id == id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    db.delete(db_program)
    db.commit()
    return {"message": "Program deleted"}

@app.post("/api/programs/{id}/users", tags=["Programs"])
async def add_user_to_program(id: str, assign_data: AddUserToProgram, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    role_to_assign = assign_data.role.upper()
    if role_to_assign not in ['ORGANISER', 'COMMITTEE', 'VOLUNTEER']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if role_to_assign in ['ORGANISER', 'COMMITTEE']:
        require_organiser(id, current_user, db)
    else:
        require_organiser_or_committee(id, current_user, db)

    target_user = db.query(DBUser).filter(DBUser.email == assign_data.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    existing_role = db.query(DBProgramUserRole).filter(
        DBProgramUserRole.user_id == target_user.id,
        DBProgramUserRole.program_id == id
    ).first()

    if existing_role:
        existing_role.role = role_to_assign
    else:
        new_role_id = str(uuid.uuid4())
        new_role = DBProgramUserRole(id=new_role_id, user_id=target_user.id, program_id=id, role=role_to_assign)
        db.add(new_role)

    db.commit()
    return {"message": f"User {assign_data.email} assigned as {role_to_assign}"}

@app.get("/api/programs/{id}/users", tags=["Programs"])
async def get_program_users(id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    role_record = db.query(DBProgramUserRole).filter(
        DBProgramUserRole.user_id == current_user.id,
        DBProgramUserRole.program_id == id
    ).first()
    if not role_record:
        raise HTTPException(status_code=403, detail="Access denied")

    roles = db.query(DBProgramUserRole).filter(DBProgramUserRole.program_id == id).all()
    user_ids = [r.user_id for r in roles]
    users = db.query(DBUser).filter(DBUser.id.in_(user_ids)).all()
    
    role_map = {r.user_id: r.role for r in roles}
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": role_map[u.id]
        }
        for u in users
    ]

# Event APIs

@app.post("/api/events", response_model=Event, tags=["Events"])
async def create_event(event: EventBase, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    if event.program_id:
        require_organiser_or_committee(event.program_id, current_user, db)
    # Generate unique ID and create
    new_id = str(uuid.uuid4())
    db_event = DBEvent(**event.model_dump(), id=new_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.get("/api/events", response_model=List[Event], tags=["Events"])
async def fetch_events(program_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(DBEvent)
    if program_id:
        query = query.filter(DBEvent.program_id == program_id)
    return query.all()

@app.get("/api/events/{id}", response_model=Event, tags=["Events"])
async def fetch_event(id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_event = db.query(DBEvent).filter(DBEvent.id == id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event

@app.put("/api/events/{id}", response_model=Event, tags=["Events"])
async def update_event(id: str, event_update: EventBase, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_event = db.query(DBEvent).filter(DBEvent.id == id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if db_event.program_id:
        require_organiser_or_committee(db_event.program_id, current_user, db)
    db_event = db.query(DBEvent).filter(DBEvent.id == id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    for key, value in event_update.model_dump().items():
        setattr(db_event, key, value)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.delete("/api/events/{id}", tags=["Events"])
async def delete_event(id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_event = db.query(DBEvent).filter(DBEvent.id == id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if db_event.program_id:
        require_organiser_or_committee(db_event.program_id, current_user, db)
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted"}

# Venue APIs

@app.post("/api/venues", response_model=Venue, tags=["Venues"])
async def add_venue(venue: VenueBase, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    if venue.program_id:
        require_organiser_or_committee(venue.program_id, current_user, db)
    new_id = str(uuid.uuid4())
    db_venue = DBVenue(**venue.model_dump(), id=new_id)
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

@app.get("/api/venues", response_model=List[Venue], tags=["Venues"])
async def fetch_venues(program_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(DBVenue)
    if program_id:
        query = query.filter(DBVenue.program_id == program_id)
    return query.all()

@app.get("/api/venues/{id}", response_model=Venue, tags=["Venues"])
async def fetch_venue(id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_venue = db.query(DBVenue).filter(DBVenue.id == id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return db_venue

@app.put("/api/venues/{id}/unavailable", response_model=Venue, tags=["Venues"])
async def set_venue_unavailable(id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_venue = db.query(DBVenue).filter(DBVenue.id == id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if db_venue.program_id:
        require_organiser_or_committee(db_venue.program_id, current_user, db)
        
    db_venue.isAvailable = False
    venue_name = db_venue.name
    program_id = db_venue.program_id
    db.commit()
    db.refresh(db_venue)
    
    # Automatic Replanning Logic
    if program_id:
        import json
        import re
        curr_schedule = db.query(DBSchedule).filter(DBSchedule.program_id == program_id).order_by(DBSchedule.timestamp.desc()).first()
        if curr_schedule and curr_schedule.data:
            try:
                # Robustly extract JSON block using regex if present
                raw_data = curr_schedule.data.strip()
                match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw_data)
                
                if match:
                    clean_json = match.group(1).strip()
                else:
                    # Fallback to finding the first { and last }
                    start_idx = raw_data.find('{')
                    end_idx = raw_data.rfind('}')
                    if start_idx != -1 and end_idx != -1:
                        clean_json = raw_data[start_idx:end_idx+1]
                    else:
                        clean_json = raw_data
                        
                parsed_data = json.loads(clean_json)
                schedule_list = parsed_data.get("schedule", [])
                
                # Check if this venue is actively used in the current schedule
                is_used = any(item.get("scheduled_venue_id") == id for item in schedule_list)
                
                if is_used:
                    # Trigger a background smart replan
                    human_prompt = f"URGENT: The venue '{venue_name}' is no longer available. You must adaptively replan the schedule to move all events currently at '{venue_name}' to other available venues with minimal disruption to the rest of the schedule."
                    
                    # Run this in the background so we don't block the API response
                    asyncio.create_task(_run_smart_replanning(program_id, db, human_prompt, curr_schedule.data))
            except Exception as e:
                print(f"Failed to check schedule for auto-replan: {e}")
                
    return db_venue

@app.put("/api/venues/{id}/available", response_model=Venue, tags=["Venues"])
async def set_venue_available(id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_venue = db.query(DBVenue).filter(DBVenue.id == id).first()
    if not db_venue:
        raise HTTPException(status_code=404, detail="Venue not found")
        
    if db_venue.program_id:
        require_organiser_or_committee(db_venue.program_id, current_user, db)
    db_venue.isAvailable = True
    db.commit()
    db.refresh(db_venue)
    return db_venue

# Volunteer APIs

@app.post("/api/volunteers", response_model=Volunteer, tags=["Volunteers"])
async def add_volunteer(volunteer: VolunteerBase, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    if volunteer.program_id:
        require_organiser_or_committee(volunteer.program_id, current_user, db)
    new_id = str(uuid.uuid4())
    db_volunteer = DBVolunteer(**volunteer.model_dump(), id=new_id)
    db.add(db_volunteer)
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@app.post("/api/volunteers/{id}/availability", response_model=Volunteer, tags=["Volunteers"])
async def submit_availability(id: str, availability: List[str], db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_volunteer = db.query(DBVolunteer).filter(DBVolunteer.id == id).first()
    if not db_volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
        
    if db_volunteer.program_id:
        require_organiser_or_committee(db_volunteer.program_id, current_user, db)
    db_volunteer.availability = availability
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@app.post("/api/volunteers/{id}/skills", response_model=Volunteer, tags=["Volunteers"])
async def submit_skills(id: str, skills: List[str], db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_volunteer = db.query(DBVolunteer).filter(DBVolunteer.id == id).first()
    if not db_volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
        
    if db_volunteer.program_id:
        require_organiser_or_committee(db_volunteer.program_id, current_user, db)
    db_volunteer.skills = skills
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@app.get("/api/volunteers/{id}/assignments", tags=["Volunteers"])
async def fetch_assignments(id: str, db: Session = Depends(get_db)):
    # Logic to fetch assignments for volunteer based on schedule
    return {"message": "Logic to fetch assignments for volunteer " + id}

# Scheduling APIs

async def _run_smart_replanning(program_id: str, db: Session, human_prompt: str, current_schedule_data: str):
    """Internal helper to attempt a targeted replan, and fallback to full generation if conflicts are unresolvable."""
    import json
    program_db = db.query(DBProgram).filter(DBProgram.id == program_id).first()
    if not program_db:
        return
        
    program_details = {
        "name": program_db.name,
        "start_date": str(program_db.start_date),
        "end_date": str(program_db.end_date),
        "daily_start_time": str(program_db.daily_start_time) if program_db.daily_start_time else None,
        "daily_end_time": str(program_db.daily_end_time) if program_db.daily_end_time else None,
        "is_24_hour_event": program_db.is_24_hour_event,
        "max_parallel_events": program_db.max_parallel_events
    }
    
    events = [Event.model_validate(e).model_dump() for e in db.query(DBEvent).filter(DBEvent.program_id == program_id).all()]
    venues = [Venue.model_validate(v).model_dump() for v in db.query(DBVenue).filter(DBVenue.program_id == program_id).all()]
    volunteers = [Volunteer.model_validate(vol).model_dump() for vol in db.query(DBVolunteer).filter(DBVolunteer.program_id == program_id).all()]
    
    if not volunteers:
        volunteer_roles = db.query(DBProgramUserRole).filter(
            DBProgramUserRole.program_id == program_id,
            DBProgramUserRole.role == 'VOLUNTEER'
        ).all()
        if volunteer_roles:
            user_ids = [r.user_id for r in volunteer_roles]
            team_volunteers = db.query(DBUser).filter(DBUser.id.in_(user_ids)).all()
            volunteers = [{"id": u.id, "name": u.full_name, "skills": u.skills if u.skills else ["General Support"], "availability": ["Anytime"]} for u in team_volunteers]
    
    if not events:
        return

    human_prompt_text = ""
    if human_prompt and human_prompt.strip():
        human_prompt_text = f"ADDITIONAL HUMAN CONSTRAINT: {human_prompt.strip()}\nYou MUST prioritize fulfilling this human constraint during replanning."

    inputs = {
        "program": program_details,
        "events": events,
        "venues": venues,
        "volunteers": volunteers,
        "human_prompt_text": human_prompt_text,
        "current_schedule": current_schedule_data
    }
    
    try:
        crew_instance = EventCrew().targeted_replan_crew()
        result_str = str(await asyncio.to_thread(crew_instance.kickoff, inputs=inputs))
        
        # Check if JSON says FATAL_UNRESOLVABLE_CONFLICT
        fallback = False
        try:
            parsed = json.loads(result_str)
            if "FATAL_UNRESOLVABLE_CONFLICT" in parsed.get("explanations", "") or "FATAL_UNRESOLVABLE_CONFLICT" in str(result_str):
                fallback = True
        except:
            if "FATAL_UNRESOLVABLE_CONFLICT" in result_str:
                fallback = True

        if fallback:
            print("Targeted replanning failed due to conflicts. Falling back to full schedule generation!")
            return await _run_schedule_generation(program_id, db, human_prompt)
            
        # Store successful targeted plan
        schedule_id = str(uuid.uuid4())
        new_schedule = DBSchedule(
            id=schedule_id,
            program_id=program_id,
            data=result_str,
            timestamp=datetime.datetime.now().isoformat()
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)
        return new_schedule
    except Exception as e:
        print(f"Failed targeted smart replan internally: {e}. Falling back to full generation.")
        return await _run_schedule_generation(program_id, db, human_prompt)

async def _run_schedule_generation(program_id: str, db: Session, human_prompt: str = ""):
    """Internal helper to actually run the crew and store the schedule."""
    program_db = db.query(DBProgram).filter(DBProgram.id == program_id).first()
    if not program_db:
        return
        
    program_details = {
        "name": program_db.name,
        "start_date": str(program_db.start_date),
        "end_date": str(program_db.end_date),
        "daily_start_time": str(program_db.daily_start_time) if program_db.daily_start_time else None,
        "daily_end_time": str(program_db.daily_end_time) if program_db.daily_end_time else None,
        "is_24_hour_event": program_db.is_24_hour_event,
        "max_parallel_events": program_db.max_parallel_events
    }
    
    events = [Event.model_validate(e).model_dump() for e in db.query(DBEvent).filter(DBEvent.program_id == program_id).all()]
    venues = [Venue.model_validate(v).model_dump() for v in db.query(DBVenue).filter(DBVenue.program_id == program_id).all()]
    volunteers = [Volunteer.model_validate(vol).model_dump() for vol in db.query(DBVolunteer).filter(DBVolunteer.program_id == program_id).all()]
    
    if not volunteers:
        volunteer_roles = db.query(DBProgramUserRole).filter(
            DBProgramUserRole.program_id == program_id,
            DBProgramUserRole.role == 'VOLUNTEER'
        ).all()
        if volunteer_roles:
            user_ids = [r.user_id for r in volunteer_roles]
            team_volunteers = db.query(DBUser).filter(DBUser.id.in_(user_ids)).all()
            volunteers = [
                {
                    "id": u.id, 
                    "name": u.full_name, 
                    "skills": u.skills if u.skills else ["General Support"], 
                    "availability": ["Anytime"]
                } 
                for u in team_volunteers
            ]
    
    if not events:
        return

    human_prompt_text = ""
    if human_prompt and human_prompt.strip():
        human_prompt_text = f"ADDITIONAL HUMAN CONSTRAINT: {human_prompt.strip()}\nYou MUST prioritize fulfilling this human constraint during replanning."

    inputs = {
        "program": program_details,
        "events": events,
        "venues": venues,
        "volunteers": volunteers,
        "human_prompt_text": human_prompt_text,
        "current_schedule": ""  # baseline expects this now
    }
    
    try:
        crew_instance = EventCrew().crew()
        result = await asyncio.to_thread(crew_instance.kickoff, inputs=inputs)
        
        schedule_id = str(uuid.uuid4())
        new_schedule = DBSchedule(
            id=schedule_id,
            program_id=program_id,
            data=str(result),
            timestamp=datetime.datetime.now().isoformat()
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)
        return new_schedule
    except Exception as e:
        print(f"Failed to generate schedule internally: {e}")
        return None


@app.post("/api/schedule/generate/{program_id}", tags=["Scheduling"])
async def generate_schedule(program_id: str, req: ScheduleGenerateRequest, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    # Ensure role is Organiser or Committee
    require_organiser_or_committee(program_id, current_user, db)
    
    new_schedule = await _run_schedule_generation(program_id, db, req.human_prompt if req.human_prompt else "")
    if not new_schedule:
        raise HTTPException(status_code=500, detail="Failed to run internal schedule generation or no events found.")
        
    return Schedule.model_validate(new_schedule)

@app.put("/api/schedule/{id}/approve", tags=["Scheduling"])
async def approve_schedule(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    db_sched = db.query(DBSchedule).filter(DBSchedule.id == id).first()
    if not db_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    require_organiser_or_committee(db_sched.program_id, current_user, db)
    
    if db_sched.is_approved:
        return {"message": "Schedule is already approved!"}
        
    # Mark as approved
    db_sched.is_approved = True
    db.commit()
    db.refresh(db_sched)
    
    # Trigger SendGrid Email Blast in background
    program_db = db.query(DBProgram).filter(DBProgram.id == db_sched.program_id).first()
    if program_db:
        # Get all users involved in this program (Volunteers, Organisers, Committee)
        program_roles = db.query(DBProgramUserRole).filter(DBProgramUserRole.program_id == program_db.id).all()
        user_ids = [r.user_id for r in program_roles]
        
        users_in_program = db.query(DBUser).filter(DBUser.id.in_(user_ids)).all()
        valid_emails = [u.email for u in users_in_program if u.email]
        
        if valid_emails:
            import json
            try:
                sched_data = json.loads(db_sched.data)
                schedule_list = sched_data.get("events", [])
                
                # Fetch human-readable names for the email table
                program_events = {e.id: e.name for e in db.query(DBEvent).filter(DBEvent.program_id == program_db.id).all()}
                program_venues = {v.id: v.name for v in db.query(DBVenue).filter(DBVenue.program_id == program_db.id).all()}
                
                readable_schedule = []
                for item in sorted(schedule_list, key=lambda x: (x.get('date', ''), x.get('start_time', ''))):
                    start_time = item.get("start_time", "")
                    end_time = item.get("end_time", "")
                    readable_schedule.append({
                        "event": program_events.get(item.get("event_id"), "Unknown Event"),
                        "venue": program_venues.get(item.get("scheduled_venue_id"), "Unknown Venue"),
                        "date": item.get("date", ""),
                        "start": start_time.split("T")[-1][:5] if start_time else "",
                        "end": end_time.split("T")[-1][:5] if end_time else ""
                    })
            except Exception as e:
                print(f"Error parsing schedule for email: {e}")
                readable_schedule = []

            background_tasks.add_task(email_dispatcher.send_schedule_approval_email, program_db.name, valid_emails, readable_schedule)
            
    return {"message": "Schedule approved and notifications queued!"}

@app.get("/api/schedule/program/{program_id}", response_model=Schedule, tags=["Scheduling"])
async def fetch_current_schedule(program_id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    role_record = db.query(DBProgramUserRole).filter(
        DBProgramUserRole.user_id == current_user.id,
        DBProgramUserRole.program_id == program_id
    ).first()
    if not role_record:
        raise HTTPException(status_code=403, detail="Access denied")

    curr_schedule = db.query(DBSchedule).filter(DBSchedule.program_id == program_id).order_by(DBSchedule.timestamp.desc()).first()
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
