from sqlalchemy import create_engine, Column, Integer, String, Boolean, JSON, Text, Date, Time, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost:3306/event_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class DBProgram(Base):
    __tablename__ = "programs"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), index=True)
    start_date = Column(Date)
    end_date = Column(Date)
    daily_start_time = Column(Time, nullable=True)
    daily_end_time = Column(Time, nullable=True)
    is_24_hour_event = Column(Boolean, default=False)
    max_parallel_events = Column(Integer, default=1)
    status = Column(Enum('PLANNING', 'ACTIVE', 'COMPLETED', name='program_status_enum'), default='PLANNING')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DBUser(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    skills = Column(JSON, nullable=True) # or default=[]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DBProgramUserRole(Base):
    __tablename__ = "program_user_roles"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), index=True)
    program_id = Column(String(36), ForeignKey("programs.id"), index=True)
    role = Column(Enum('ORGANISER', 'COMMITTEE', 'VOLUNTEER', name='program_role_enum'), default='VOLUNTEER')

class DBEvent(Base):
    __tablename__ = "events"

    program_id = Column(String(36), ForeignKey("programs.id"), index=True)

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), index=True)
    duration = Column(Integer)
    expectedParticipants = Column(Integer)
    priority = Column(Integer)
    domain = Column(String(255))
    preferredVenueId = Column(String(36), nullable=True)

class DBVenue(Base):
    __tablename__ = "venues"

    program_id = Column(String(36), ForeignKey("programs.id"), index=True)

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), index=True)
    capacity = Column(Integer)
    facilities = Column(JSON)
    isAvailable = Column(Boolean, default=True)

class DBVolunteer(Base):
    __tablename__ = "volunteers"

    program_id = Column(String(36), ForeignKey("programs.id"), index=True)

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), index=True)
    skills = Column(JSON)
    availability = Column(JSON)

class DBSchedule(Base):
    __tablename__ = "schedules"

    program_id = Column(String(36), ForeignKey("programs.id"), index=True)

    id = Column(String(36), primary_key=True, index=True)
    data = Column(Text)
    timestamp = Column(String(255))
    is_approved = Column(Boolean, default=False)

def init_db():
    Base.metadata.create_all(bind=engine)
