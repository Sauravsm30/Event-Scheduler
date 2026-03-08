import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, UserPlus, Plus, Calendar, MapPin, Search, Users, Crown, Award, X } from 'lucide-react';

const ProgramDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [program, setProgram] = useState(null);
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [venues, setVenues] = useState([]);
    const [myRole, setMyRole] = useState('VOLUNTEER');
    const [schedule, setSchedule] = useState(null);
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [humanPrompt, setHumanPrompt] = useState("");
    const [showMyDutiesOnly, setShowMyDutiesOnly] = useState(false);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ name: '', duration: 60, expectedParticipants: 0, priority: 1, domain: 'General', preferredVenueId: '' });

    // Browse Users states
    const [showBrowseUsers, setShowBrowseUsers] = useState(false);
    const [browseUsers, setBrowseUsers] = useState([]);
    const [browsePage, setBrowsePage] = useState(0);
    const [hasMoreUsers, setHasMoreUsers] = useState(true);

    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', role: 'COMMITTEE' });

    // Static list of vibrant colors to cycle through for profile pictures
    const profileColors = [
        '#ef4444', // red
        '#f97316', // orange
        '#f59e0b', // amber
        '#10b981', // emerald
        '#06b6d4', // cyan
        '#3b82f6', // blue
        '#8b5cf6', // violet
        '#d946ef', // fuchsia
        '#f43f5e'  // rose
    ];

    const rolesPriority = {
        'ORGANISER': 3,
        'COMMITTEE': 2,
        'VOLUNTEER': 1,
        'PARTICIPANT': 0
    };
    const [showAddVenue, setShowAddVenue] = useState(false);
    const [newVenue, setNewVenue] = useState({ name: '', capacity: 0, facilities: '' });

    // For editing events
    const [editingEvent, setEditingEvent] = useState(null);

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

            // Fetch Venues
            try {
                const venuesRes = await api.get(`/api/venues?program_id=${id}`);
                setVenues(venuesRes.data);
            } catch (err) {
                console.error("Venues fetch error:", err);
            }

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
            const payload = { ...newEvent, program_id: id };
            if (!payload.preferredVenueId) delete payload.preferredVenueId;

            await api.post('/api/events', payload);
            setShowAddEvent(false);
            setNewEvent({ name: '', duration: 60, expectedParticipants: 0, priority: 1, domain: 'General', preferredVenueId: '' });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...editingEvent };
            if (!payload.preferredVenueId) delete payload.preferredVenueId;

            await api.put(`/api/events/${editingEvent.id}`, payload);
            setEditingEvent(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Error updating event.");
        }
    };

    const handleAddVenue = async (e) => {
        e.preventDefault();
        try {
            const facilitiesArray = newVenue.facilities.split(',').map(f => f.trim()).filter(f => f);
            await api.post('/api/venues', { ...newVenue, facilities: facilitiesArray, program_id: id });
            setShowAddVenue(false);
            setNewVenue({ name: '', capacity: 0, facilities: '' });
            fetchData();
        } catch (err) {
            console.error("Add Venue Error:", err);
            alert("Error adding venue.");
        }
    };

    const toggleVenueAvailability = async (venue) => {
        try {
            const endpoint = venue.isAvailable ? `/api/venues/${venue.id}/unavailable` : `/api/venues/${venue.id}/available`;
            await api.put(endpoint);
            fetchData();
        } catch (err) {
            console.error("Toggle Venue Error:", err);
            alert("Error toggling venue availability.");
        }
    };

    const handleGenerateSchedule = async () => {
        setIsGeneratingSchedule(true);
        try {
            await api.post(`/api/schedule/generate/${id}`, { human_prompt: humanPrompt });
            const schedRes = await api.get(`/api/schedule/program/${id}`);
            setSchedule(schedRes.data);
            setHumanPrompt(""); // clear prompt after generating
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

    const fetchBrowseUsers = async (page = 0) => {
        try {
            const limit = 5;
            const res = await api.get(`/api/users?skip=${page * limit}&limit=${limit}`);
            if (page === 0) setBrowseUsers(res.data);
            else setBrowseUsers(prev => [...prev, ...res.data]);

            setBrowsePage(page);
            setHasMoreUsers(res.data.length === limit);
        } catch (err) {
            console.error("Failed to load users for browsing", err);
        }
    };

    const openBrowseModal = () => {
        setShowBrowseUsers(true);
        fetchBrowseUsers(0);
    };

    const selectUserFromBrowse = (email) => {
        setNewUser({ ...newUser, email });
        setShowBrowseUsers(false);
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

                {canManage && (
                    <>
                        {/* EVENT MANAGEMENT */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
                            <h2>Events Schedule</h2>
                            <button className="btn btn-primary" onClick={() => setShowAddEvent(!showAddEvent)}>
                                <Plus size={18} /> Add Event
                            </button>
                        </div>

                        {showAddEvent && (
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
                                    <div>
                                        <label>Preferred Venue (Optional)</label>
                                        <select value={newEvent.preferredVenueId} onChange={e => setNewEvent({ ...newEvent, preferredVenueId: e.target.value })}>
                                            <option value="">No Preference</option>
                                            {venues.filter(v => v.isAvailable).map(v => (
                                                <option key={v.id} value={v.id}>{v.name} (Cap: {v.capacity})</option>
                                            ))}
                                        </select>
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
                                <div key={event.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {editingEvent?.id === event.id ? (
                                        <form onSubmit={handleUpdateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label>Event Name</label>
                                                <input required type="text" value={editingEvent.name} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label>Duration (min)</label>
                                                <input required type="number" min="1" value={editingEvent.duration} onChange={e => setEditingEvent({ ...editingEvent, duration: parseInt(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label>Expected Participants</label>
                                                <input required type="number" min="0" value={editingEvent.expectedParticipants} onChange={e => setEditingEvent({ ...editingEvent, expectedParticipants: parseInt(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label>Priority</label>
                                                <input required type="number" min="1" value={editingEvent.priority} onChange={e => setEditingEvent({ ...editingEvent, priority: parseInt(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label>Domain</label>
                                                <input required type="text" value={editingEvent.domain} onChange={e => setEditingEvent({ ...editingEvent, domain: e.target.value })} />
                                            </div>
                                            <div>
                                                <label>Preferred Venue (Optional)</label>
                                                <select value={editingEvent.preferredVenueId || ''} onChange={e => setEditingEvent({ ...editingEvent, preferredVenueId: e.target.value })}>
                                                    <option value="">No Preference</option>
                                                    {venues.filter(v => v.isAvailable || v.id === editingEvent.preferredVenueId).map(v => (
                                                        <option key={v.id} value={v.id}>{v.name} (Cap: {v.capacity})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                                <button type="button" className="btn btn-secondary" onClick={() => setEditingEvent(null)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary">Update Event</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h3 style={{ margin: 0 }}>{event.name}</h3>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {event.duration} min</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14} /> {event.expectedParticipants} pax</span>
                                                    <span>Domain: {event.domain}</span>
                                                    {event.preferredVenueId && venues.find(v => v.id === event.preferredVenueId) && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-color)' }}>
                                                            <MapPin size={14} /> Pref: {venues.find(v => v.id === event.preferredVenueId).name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                                <div style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: '500' }}>
                                                    Priority: {event.priority}
                                                </div>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setEditingEvent(event)}>
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* VENUE MANAGEMENT */}
                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', marginBottom: '2rem' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>Venues</h2>
                            <button className="btn btn-secondary" onClick={() => setShowAddVenue(!showAddVenue)}>
                                <Plus size={18} /> Add Venue
                            </button>
                        </div>

                        {showAddVenue && (
                            <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--text-secondary)' }}>
                                <h3>Add a New Venue</h3>
                                <form onSubmit={handleAddVenue} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label>Venue Name</label>
                                        <input required type="text" value={newVenue.name} onChange={e => setNewVenue({ ...newVenue, name: e.target.value })} placeholder="e.g. Main Auditorium" />
                                    </div>
                                    <div>
                                        <label>Capacity</label>
                                        <input required type="number" min="1" value={newVenue.capacity} onChange={e => setNewVenue({ ...newVenue, capacity: parseInt(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label>Facilities (Comma separated)</label>
                                        <input required type="text" value={newVenue.facilities} onChange={e => setNewVenue({ ...newVenue, facilities: e.target.value })} placeholder="Projector, WiFi, AC" />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddVenue(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary">Save Venue</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '4rem' }}>
                            {venues.length === 0 && !showAddVenue && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No venues added yet.
                                </div>
                            )}
                            {venues.map(v => (
                                <div key={v.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: v.isAvailable ? 1 : 0.6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={16} /> {v.name}</h3>
                                        <button
                                            onClick={() => toggleVenueAvailability(v)}
                                            style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: v.isAvailable ? 'var(--text-color)' : 'red' }}
                                        >
                                            {v.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                                        </button>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        Capacity: {v.capacity} pax
                                    </div>
                                    <div style={{ fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                        {v.facilities.map((fac, idx) => (
                                            <span key={idx} style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{fac}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* SCHEDULE MANAGEMENT */}
                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', marginBottom: '2rem', marginTop: '2rem' }} />
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h2 style={{ margin: 0 }}>Program Schedule & Duties</h2>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <input
                                    type="checkbox"
                                    checked={showMyDutiesOnly}
                                    onChange={(e) => setShowMyDutiesOnly(e.target.checked)}
                                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                                Show My Duties Only
                            </label>
                        </div>
                    </div>
                    {canManage && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flex: '1 1 300px' }}>
                            <textarea
                                value={humanPrompt}
                                onChange={e => setHumanPrompt(e.target.value)}
                                placeholder="Optional: NLP Constraints (e.g., 'Prefer event X in the morning')"
                                style={{ width: '100%', maxWidth: '400px', minHeight: '60px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', resize: 'vertical' }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerateSchedule}
                                disabled={isGeneratingSchedule || events.length === 0}
                                style={{ backgroundColor: 'var(--accent-color)', width: '100%', maxWidth: '400px' }}
                            >
                                {isGeneratingSchedule ? 'Generating...' : 'Generate AI Schedule'}
                            </button>
                        </div>
                    )}
                </div>

                {schedule ? (
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Last generated: {new Date(schedule.timestamp).toLocaleString()}
                        </div>
                        {(() => {
                            try {
                                // Strip potential markdown code blocks returned by the AI
                                const cleanData = schedule.data.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
                                const parsedSchedule = JSON.parse(cleanData);

                                const renderExplanationHTML = (text) => {
                                    if (!text) return { __html: '' };

                                    let formatted = text;

                                    // 1. Escape HTML FIRST so we don't accidentally escape our own generated tags later!
                                    formatted = formatted
                                        .replace(/&/g, "&amp;")
                                        .replace(/</g, "&lt;")
                                        .replace(/>/g, "&gt;");

                                    // 2. Remove redundant (ID: ...) blocks entirely
                                    formatted = formatted.replace(/\s*\(ID:\s*[^)]+\)/gi, '');

                                    // 3. Replace any remaining naked UUIDs with actual names
                                    const idToNameMap = {};
                                    events.forEach(e => idToNameMap[e.id] = e.name);
                                    venues.forEach(v => idToNameMap[v.id] = v.name);
                                    users.forEach(u => idToNameMap[u.id] = u.full_name);

                                    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
                                    formatted = formatted.replace(uuidRegex, (match) => {
                                        return idToNameMap[match] ? `<strong>${idToNameMap[match]}</strong>` : '';
                                    });

                                    // 4. Parse simple Markdown
                                    formatted = formatted
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        // For bullets, replace ^* with a nice list item style
                                        .replace(/^\s*\*\s+(.*)$/gm, '<div style="margin-left: 1.5rem; display: list-item;">$1</div>')
                                        // Single asterisks for italics
                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                        .replace(/^#{1,6}\s+(.*)$/gm, '<strong>$1</strong>');

                                    return { __html: formatted };
                                };

                                // If successful, render the new UI cards
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {parsedSchedule.schedule && parsedSchedule.schedule.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {(() => {
                                                    // Group events by date, filtering if showMyDutiesOnly is true
                                                    const groupedEvents = parsedSchedule.schedule.reduce((acc, item) => {
                                                        if (showMyDutiesOnly) {
                                                            const volIds = item.volunteer_ids || [];
                                                            if (!volIds.includes(user.id)) return acc;
                                                        }

                                                        const dateKey = item.date || 'Unscheduled';
                                                        if (!acc[dateKey]) acc[dateKey] = [];
                                                        acc[dateKey].push(item);
                                                        return acc;
                                                    }, {});

                                                    if (Object.keys(groupedEvents).length === 0) {
                                                        return (
                                                            <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                                                {showMyDutiesOnly ? "You have no events assigned in this schedule." : "No events are present in this schedule."}
                                                            </div>
                                                        );
                                                    }

                                                    // Sort dates chronologically
                                                    const sortedDates = Object.keys(groupedEvents).sort((a, b) => {
                                                        if (a === 'Unscheduled') return 1;
                                                        if (b === 'Unscheduled') return -1;
                                                        return new Date(a) - new Date(b);
                                                    });

                                                    return sortedDates.map(dateKey => (
                                                        <div key={dateKey} className="date-group" style={{ marginBottom: '1.5rem' }}>
                                                            <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <Calendar size={20} />
                                                                {dateKey}
                                                            </h3>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                                {groupedEvents[dateKey].map((item, index) => {
                                                                    // Resolve IDs to full objects for display
                                                                    const eventObj = events.find(e => e.id === item.event_id) || { name: 'Unknown Event' };
                                                                    const venueObj = venues.find(v => v.id === item.scheduled_venue_id);
                                                                    const vName = venueObj ? venueObj.name : 'Unknown Venue';

                                                                    // Volunteers could be an array of IDs
                                                                    const volIds = item.volunteer_ids || [];
                                                                    const volNames = volIds.map(vid => {
                                                                        const u = users.find(user => user.id === vid);
                                                                        return u ? u.full_name : 'Unknown Volunteer';
                                                                    }).join(', ');

                                                                    const formatDateTimeForPill = (timeStr, fallbackDateStr) => {
                                                                        if (!timeStr) return 'TBD';
                                                                        const t = String(timeStr).trim();

                                                                        let dObj = new Date(t);
                                                                        if (!isNaN(dObj) && t.includes('-')) {
                                                                            const hrs = String(dObj.getHours()).padStart(2, '0');
                                                                            const mins = String(dObj.getMinutes()).padStart(2, '0');
                                                                            const dateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                                            return `${hrs}:${mins} (${dateStr})`;
                                                                        }

                                                                        let timePart = t;
                                                                        if (/^\d{2}:\d{2}/.test(t)) timePart = t.substring(0, 5);

                                                                        if (fallbackDateStr && fallbackDateStr !== 'Unscheduled') {
                                                                            const fallObj = new Date(fallbackDateStr);
                                                                            if (!isNaN(fallObj)) {
                                                                                const dateStr = fallObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                                                return `${timePart} (${dateStr})`;
                                                                            }
                                                                            return `${timePart} (${fallbackDateStr})`;
                                                                        }
                                                                        return timePart;
                                                                    };

                                                                    const eventGradients = [
                                                                        'linear-gradient(135deg, rgba(254, 242, 242, 0.05) 0%, rgba(254, 226, 226, 0.05) 100%)', // subtle dark red
                                                                        'linear-gradient(135deg, rgba(239, 246, 255, 0.05) 0%, rgba(219, 234, 254, 0.05) 100%)', // subtle dark blue
                                                                        'linear-gradient(135deg, rgba(240, 253, 244, 0.05) 0%, rgba(220, 252, 231, 0.05) 100%)', // subtle dark green
                                                                        'linear-gradient(135deg, rgba(255, 251, 235, 0.05) 0%, rgba(254, 243, 199, 0.05) 100%)', // subtle dark yellow
                                                                        'linear-gradient(135deg, rgba(250, 245, 255, 0.05) 0%, rgba(243, 232, 255, 0.05) 100%)'  // subtle dark purple
                                                                    ];

                                                                    const eventBorderColors = [
                                                                        '#ef4444', // red
                                                                        '#3b82f6', // blue
                                                                        '#10b981', // green
                                                                        '#f59e0b', // yellow
                                                                        '#8b5cf6'  // purple
                                                                    ];

                                                                    return (
                                                                        <div key={index} className="card" style={{ background: eventGradients[index % eventGradients.length], borderLeft: `4px solid ${eventBorderColors[index % eventBorderColors.length]}`, padding: '1.25rem' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>{eventObj.name}</h4>
                                                                                <div style={{ backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                                                    {formatDateTimeForPill(item.start_time, dateKey)} - {formatDateTimeForPill(item.end_time, dateKey)}
                                                                                </div>
                                                                            </div>

                                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                    <MapPin size={16} />
                                                                                    <span><strong>Venue:</strong> {vName}</span>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                    <Users size={16} />
                                                                                    <span><strong>Team:</strong> {volNames || 'None assigned'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                                                No events were successfully scheduled.
                                            </div>
                                        )}

                                        {/* AI Explanations Box */}
                                        {parsedSchedule.explanations && (
                                            <div className="card" style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--primary-color)', marginTop: '0.5rem' }}>
                                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    ✨ AI Scheduling Reasoning
                                                </h4>
                                                <p
                                                    style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}
                                                    dangerouslySetInnerHTML={renderExplanationHTML(parsedSchedule.explanations)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            } catch (e) {
                                // Fallback: If it's not valid JSON, just render it exactly as it used to be
                                return (
                                    <div className="card" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', overflowX: 'auto', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                        {schedule.data}
                                    </div>
                                );
                            }
                        })()}
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
                        <form onSubmit={handleAddUser} style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>User Email</span>
                                    <span
                                        style={{ color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.85rem' }}
                                        onClick={openBrowseModal}
                                    >
                                        Browse Users
                                    </span>
                                </label>
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
                    {users.map((u, index) => (
                        <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: profileColors[index % profileColors.length], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h4 style={{ margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.full_name}</h4>
                                    {u.role === 'ORGANISER' && <Crown size={16} color="#fbbf24" fill="rgba(251, 191, 36, 0.2)" title="Organiser" />}
                                    {u.role === 'COMMITTEE' && <Award size={16} color="#60a5fa" title="Committee Member" />}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.email}</div>
                                <div style={{ color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{u.role}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* BROWSE USERS MODAL */}
                {showBrowseUsers && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>Browse Global Users</h3>
                                <button type="button" onClick={() => setShowBrowseUsers(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {browseUsers.map(u => {
                                    const isAlreadyInProgram = users.some(existing => existing.id === u.id);
                                    return (
                                        <div
                                            key={u.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                                                opacity: isAlreadyInProgram ? 0.5 : 1
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{u.full_name}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => selectUserFromBrowse(u.email)}
                                                disabled={isAlreadyInProgram}
                                            >
                                                {isAlreadyInProgram ? 'Added' : 'Select'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {hasMoreUsers && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ marginTop: '1rem', width: '100%' }}
                                    onClick={() => fetchBrowseUsers(browsePage + 1)}
                                >
                                    Load More Users
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProgramDetails;
