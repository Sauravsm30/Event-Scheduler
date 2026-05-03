import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Plus, Calendar, Users, User } from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newProgram, setNewProgram] = useState({ name: '', start_date: '', end_date: '', is_24_hour_event: false, daily_start_time: '', daily_end_time: '' });

    useEffect(() => {
        fetchPrograms();
    }, []);

    const fetchPrograms = async () => {
        try {
            const res = await api.get('/api/programs');
            setPrograms(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...newProgram };
            if (payload.is_24_hour_event) {
                delete payload.daily_start_time;
                delete payload.daily_end_time;
            } else {
                if (!payload.daily_start_time) delete payload.daily_start_time;
                if (!payload.daily_end_time) delete payload.daily_end_time;
            }
            await api.post('/api/programs', payload);
            setShowCreate(false);
            setNewProgram({ name: '', start_date: '', end_date: '', is_24_hour_event: false, daily_start_time: '', daily_end_time: '' });
            fetchPrograms(); // Refresh list
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="dashboard-layout">
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="brand">EventHub</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Welcome, <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{user?.full_name}</span></span>
                        <button className="btn btn-secondary" onClick={() => navigate('/profile')} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} /> Profile
                        </button>
                        <button className="btn btn-secondary" onClick={() => logout()} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="main-content container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2>Your Programs</h2>
                    <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                        <Plus size={18} /> Create Program
                    </button>
                </div>

                {showCreate && (
                    <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-color)' }}>
                        <h3>Create a New Program</h3>
                        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Program Name</label>
                                <input required type="text" value={newProgram.name} onChange={e => setNewProgram({ ...newProgram, name: e.target.value })} placeholder="e.g. Annual Tech Conference 2026" />
                            </div>
                            <div>
                                <label>Start Date</label>
                                <input required type="date" value={newProgram.start_date} onChange={e => setNewProgram({ ...newProgram, start_date: e.target.value })} />
                            </div>
                            <div>
                                <label>End Date</label>
                                <input required type="date" value={newProgram.end_date} onChange={e => setNewProgram({ ...newProgram, end_date: e.target.value })} />
                            </div>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    id="is24hour" 
                                    checked={newProgram.is_24_hour_event} 
                                    onChange={e => setNewProgram({ ...newProgram, is_24_hour_event: e.target.checked })} 
                                    style={{ transform: 'scale(1.2)' }}
                                />
                                <label htmlFor="is24hour" style={{ margin: 0, cursor: 'pointer' }}>This is a 24-hour event (no daily start/end times)</label>
                            </div>
                            {!newProgram.is_24_hour_event && (
                                <>
                                    <div>
                                        <label>Daily Start Time (Optional)</label>
                                        <input type="time" value={newProgram.daily_start_time || ''} onChange={e => setNewProgram({ ...newProgram, daily_start_time: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Daily End Time (Optional)</label>
                                        <input type="time" value={newProgram.daily_end_time || ''} onChange={e => setNewProgram({ ...newProgram, daily_end_time: e.target.value })} />
                                    </div>
                                </>
                            )}
                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Program</button>
                            </div>
                        </form>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {programs.length === 0 && !showCreate && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={48} opacity={0.5} style={{ marginBottom: '1rem' }} />
                            <p>You aren't a member of any programs yet.</p>
                            <p>Create one to get started!</p>
                        </div>
                    )}
                    {programs.map(program => (
                        <div
                            key={program.id}
                            className="card"
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
                            onClick={() => navigate(`/programs/${program.id}`)}
                        >
                            <h3 style={{ color: 'var(--accent-color)', fontSize: '1.25rem' }}>{program.name}</h3>
                            <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Calendar size={16} />
                                    {program.start_date} to {program.end_date}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
