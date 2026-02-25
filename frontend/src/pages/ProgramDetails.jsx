import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, UserPlus, Plus, Calendar, MapPin, Search, Users } from 'lucide-react';

const ProgramDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [program, setProgram] = useState(null);
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [myRole, setMyRole] = useState('VOLUNTEER');
    const [schedule, setSchedule] = useState(null);
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ name: '', duration: 60, expectedParticipants: 0, priority: 1, domain: 'General' });

    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', role: 'COMMITTEE' });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const progRes = await api.get(`/api/programs/${id}`);
            setProgram(progRes.data);

            const evtRes = await api.get(`/api/events?program_id=${id}`);
            setEvents(evtRes.data);

            const usersRes = await api.get(`/api/programs/${id}/users`);
            setUsers(usersRes.data);

            const me = usersRes.data.find(u => u.id === user.id);
            if (me) setMyRole(me.role);

            // Fetch schedule if it exists
            try {
                if (me) { // They have access
                    const schedRes = await api.get(`/api/schedule/program/${id}`);
                    setSchedule(schedRes.data);
                }
            } catch (err) {
                if (err.response?.status !== 404) {
                    console.error("Schedule fetch error:", err);
                }
            }
        } catch (err) {
            console.error(err);
            if (err.response?.status === 403 || err.response?.status === 404) {
                navigate('/');
            }
        }
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/events', { ...newEvent, program_id: id });
            setShowAddEvent(false);
            setNewEvent({ name: '', duration: 60, expectedParticipants: 0, priority: 1, domain: 'General' });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateSchedule = async () => {
        setIsGeneratingSchedule(true);
        try {
            await api.post(`/api/schedule/generate/${id}`);
            const schedRes = await api.get(`/api/schedule/program/${id}`);
            setSchedule(schedRes.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Error generating schedule");
        } finally {
            setIsGeneratingSchedule(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/programs/${id}/users`, newUser);
            setShowAddUser(false);
            setNewUser({ email: '', role: 'COMMITTEE' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "Error adding user");
            console.error(err);
        }
    };

    const canManage = ['ORGANISER', 'COMMITTEE'].includes(myRole);
    const canAddOrganiser = myRole === 'ORGANISER';

    if (!program) return (
        <div className="dashboard-layout"><div className="container" style={{ paddingTop: '2rem' }}>Loading...</div></div>
    );

    return (
        <div className="dashboard-layout">
            <nav className="navbar">
                <div className="container navbar-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem', borderRadius: '50%' }}>
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="brand" style={{ margin: 0, fontSize: '1.25rem' }}>{program.name}</h1>
                    </div>
                    <div>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '99px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-color)', fontWeight: '600', fontSize: '0.85rem' }}>
                            Your Role: {myRole}
                        </span>
                    </div>
                </div>
            </nav>

            <main className="main-content container">

                {/* EVENT MANAGEMENT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <h2>Events Schedule</h2>
                    {canManage && (
                        <button className="btn btn-primary" onClick={() => setShowAddEvent(!showAddEvent)}>
                            <Plus size={18} /> Add Event
                        </button>
                    )}
                </div>

                {showAddEvent && canManage && (
                    <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-color)' }}>
                        <h3>Create a New Event</h3>
                        <form onSubmit={handleAddEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Event Name</label>
                                <input required type="text" value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="e.g. Opening Keynote" />
                            </div>
                            <div>
                                <label>Duration (minutes)</label>
                                <input required type="number" min="1" value={newEvent.duration} onChange={e => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label>Expected Participants</label>
                                <input required type="number" min="0" value={newEvent.expectedParticipants} onChange={e => setNewEvent({ ...newEvent, expectedParticipants: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label>Priority</label>
                                <input required type="number" min="1" value={newEvent.priority} onChange={e => setNewEvent({ ...newEvent, priority: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label>Domain</label>
                                <input required type="text" value={newEvent.domain} onChange={e => setNewEvent({ ...newEvent, domain: e.target.value })} placeholder="e.g. General" />
                            </div>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEvent(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Event</button>
                            </div>
                        </form>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '4rem' }}>
                    {events.length === 0 && !showAddEvent && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                            <p>No events scheduled yet.</p>
                        </div>
                    )}
                    {events.map(event => (
                        <div key={event.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{event.name}</h3>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {event.duration} min</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14} /> {event.expectedParticipants} pax</span>
                                    <span>Domain: {event.domain}</span>
                                </div>
                            </div>
                            <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: '500' }}>
                                Priority: {event.priority}
                            </div>
                        </div>
                    ))}
                </div>

                {/* SCHEDULE MANAGEMENT */}
                <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', marginBottom: '2rem' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Program Schedule & Duties</h2>
                    {canManage && (
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerateSchedule}
                            disabled={isGeneratingSchedule || events.length === 0}
                            style={{ backgroundColor: 'var(--accent-color)' }}
                        >
                            {isGeneratingSchedule ? 'Generating...' : 'Generate AI Schedule'}
                        </button>
                    )}
                </div>

                {schedule ? (
                    <div className="card" style={{ marginBottom: '2rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', overflowX: 'auto', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Last generated: {new Date(schedule.timestamp).toLocaleString()}
                        </div>
                        {schedule.data}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
                        <p>{canManage ? "No schedule generated yet. Add events and click 'Generate AI Schedule'." : "The schedule has not been generated by the organizer yet."}</p>
                    </div>
                )}

                {/* TEAM MANAGEMENT */}
                <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', marginBottom: '2rem' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Team Members</h2>
                    {canManage && (
                        <button className="btn btn-secondary" onClick={() => setShowAddUser(!showAddUser)}>
                            <UserPlus size={18} /> Assign User
                        </button>
                    )}
                </div>

                {showAddUser && canManage && (
                    <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--text-secondary)' }}>
                        <h3>Assign a User to this Program</h3>
                        <form onSubmit={handleAddUser} style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label>User Email</label>
                                <input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Role</label>
                                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    {canAddOrganiser && <option value="ORGANISER">Organiser</option>}
                                    <option value="COMMITTEE">Committee Member</option>
                                    <option value="VOLUNTEER">Volunteer</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUser(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Assign Role</button>
                            </div>
                        </form>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {users.map(u => (
                        <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <h4 style={{ margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.full_name}</h4>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.email}</div>
                                <div style={{ color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{u.role}</div>
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
};

export default ProgramDetails;
