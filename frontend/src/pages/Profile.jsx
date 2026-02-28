import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Save, User } from 'lucide-react';

const Profile = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [initialSkills, setInitialSkills] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const defaultSkills = [
        "General Support",
        "Registration",
        "Tech Support",
        "Crowd Control",
        "Setup & Teardown",
        "Medical / First Aid"
    ];

    useEffect(() => {
        if (user) {
            const existingSkills = user.skills || [];
            const skills = existingSkills.includes("General Support") ? existingSkills : ["General Support", ...existingSkills];
            setSelectedSkills(skills);
            setInitialSkills(skills);
        }
    }, [user]);

    const hasUnsavedChanges =
        selectedSkills.length !== initialSkills.length ||
        !selectedSkills.every(s => initialSkills.includes(s));

    const toggleSkill = (skill) => {
        if (skill === "General Support") return;
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await api.patch('/api/users/me/skills', { skills: selectedSkills });
            setMessage({ type: 'success', text: 'Skills updated successfully!' });
            setInitialSkills([...selectedSkills]); // Update baseline after successful save
            // Optionally update the context user here if needed, but it will refresh on next load
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to update skills. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="dashboard-layout">
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>EventHub</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Welcome, <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{user?.full_name}</span></span>
                    </div>
                </div>
            </nav>

            <main className="main-content container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => navigate('/')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={24} color="var(--accent-color)" /> My Profile
                    </h2>
                </div>

                <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-color)' }}>Personal Details</h3>
                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}><strong>Name:</strong> {user?.full_name}</p>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>Email:</strong> {user?.email}</p>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>My Volunteer Skills</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            Select the skills you can offer. These will be used by the AI scheduling engine to assign you to relevant tasks across all programs.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {defaultSkills.map(skill => (
                                <div
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '20px',
                                        fontSize: '0.9rem',
                                        cursor: skill === "General Support" ? 'not-allowed' : 'pointer',
                                        border: selectedSkills.includes(skill) ? '1px solid var(--success-color)' : '1px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: selectedSkills.includes(skill) ? 'var(--success-color)' : 'var(--text-secondary)',
                                        transition: 'all 0.2s',
                                        fontWeight: selectedSkills.includes(skill) ? '600' : '400',
                                        opacity: skill === "General Support" ? 0.8 : 1
                                    }}
                                >
                                    {skill}
                                </div>
                            ))}
                        </div>
                    </div>

                    {message && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1rem',
                            borderRadius: '8px',
                            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: message.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            color: message.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                            className={hasUnsavedChanges ? "btn btn-primary" : "btn"}
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                opacity: (!hasUnsavedChanges && !isSaving) ? 0.5 : 1,
                                cursor: (!hasUnsavedChanges && !isSaving) ? 'not-allowed' : 'pointer',
                                padding: '0.75rem 1.5rem',
                                ...(hasUnsavedChanges ? {} : { backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' })
                            }}
                        >
                            <Save size={18} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
