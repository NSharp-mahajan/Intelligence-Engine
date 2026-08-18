'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '../../../lib/api';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface CandidateSkill {
  skillId: string;
  proficiency: string | null;
  skill: Skill;
}

interface ProjectSkill {
  skillId: string;
  skill: Skill;
}

interface Project {
  id: string;
  name: string;
  description: string;
  githubUrl: string | null;
  liveUrl: string | null;
  projectSkills: ProjectSkill[];
}

export default function EvidencePage() {
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isAddSkillModalOpen, setAddSkillModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [isAddProjectSkillModalOpen, setAddProjectSkillModalOpen] = useState(false);

  // Active items for modals
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToAddSkillTo, setProjectToAddSkillTo] = useState<Project | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [skillsRes, projectsRes] = await Promise.all([
        fetchApi('/profile/skills'),
        fetchApi('/profile/projects')
      ]);
      setCandidateSkills(skillsRes.candidateSkills || []);
      setProjects(projectsRes.projects || []);
    } catch (err: any) {
      setError('Unable to load your evidence. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers ---
  const handleRemoveSkill = async (skillId: string) => {
    try {
      await fetchApi(`/profile/skills/${skillId}`, { method: 'DELETE' });
      setCandidateSkills(prev => prev.filter(s => s.skillId !== skillId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove skill');
    }
  };

  const handleRemoveProjectSkill = async (projectId: string, skillId: string) => {
    try {
      await fetchApi(`/profile/projects/${projectId}/skills/${skillId}`, { method: 'DELETE' });
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, projectSkills: p.projectSkills.filter(s => s.skillId !== skillId) };
        }
        return p;
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to remove skill from project');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading your evidence...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Skills & Projects</h1>
        <p style={styles.subtitle}>Build the evidence behind your career profile.</p>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Verified Skills</h2>
          <Button variant="outline" onClick={() => setAddSkillModalOpen(true)}>+ Add Skill</Button>
        </div>
        
        <Card>
          <CardBody>
            {candidateSkills.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No skills added yet.</p>
              </div>
            ) : (
              <div style={styles.skillsList}>
                {candidateSkills.map(cs => (
                  <div key={cs.skillId} style={styles.skillPill}>
                    <Badge variant="success">{cs.skill.name}</Badge>
                    <button 
                      style={styles.removeSkillBtn}
                      onClick={() => handleRemoveSkill(cs.skillId)}
                      aria-label={`Remove ${cs.skill.name}`}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleGroup}>
            <h2 style={styles.sectionTitle}>Project Evidence</h2>
            <p style={styles.sectionSubtitle}>Your projects are the technical evidence the engine uses to understand what you can actually build.</p>
          </div>
          <Button variant="primary" onClick={() => { setEditingProject(null); setProjectModalOpen(true); }}>+ Add Project</Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardBody>
              <div style={styles.emptyState}>
                <p>No project evidence yet.</p>
                <div style={{ marginTop: '1rem' }}>
                  <Button variant="outline" onClick={() => { setEditingProject(null); setProjectModalOpen(true); }}>+ Add Project</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div style={styles.projectsGrid}>
            {projects.map(project => (
              <Card key={project.id}>
                <CardHeader>
                  <div style={styles.projectHeader}>
                    <h3 style={styles.projectName}>{project.name}</h3>
                    <div style={styles.projectActions}>
                      <button 
                        style={styles.actionBtnText} 
                        onClick={() => { setEditingProject(project); setProjectModalOpen(true); }}
                      >
                        Edit
                      </button>
                      <button 
                        style={{...styles.actionBtnText, color: '#dc2626'}}
                        onClick={() => { setProjectToDelete(project); setDeleteProjectModalOpen(true); }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <p style={styles.projectDesc}>{project.description}</p>
                  
                  <div style={styles.projectLinks}>
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" style={styles.projectLink}>
                        GitHub &rarr;
                      </a>
                    )}
                    {project.liveUrl && (
                      <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={styles.projectLink}>
                        Live Demo &rarr;
                      </a>
                    )}
                  </div>

                  <div style={styles.projectSkillsSection}>
                    <div style={styles.projectSkillsHeader}>
                      <span style={styles.projectSkillsTitle}>Skills demonstrated:</span>
                    </div>
                    <div style={styles.skillsList}>
                      {project.projectSkills.map(ps => (
                        <div key={ps.skillId} style={styles.skillPill}>
                          <Badge variant="neutral">{ps.skill.name}</Badge>
                          <button 
                            style={styles.removeSkillBtn}
                            onClick={() => handleRemoveProjectSkill(project.id, ps.skillId)}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      <button 
                        style={styles.addProjectSkillBtn}
                        onClick={() => { setProjectToAddSkillTo(project); setAddProjectSkillModalOpen(true); }}
                      >
                        + Add Skill
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <AddSkillModal 
        isOpen={isAddSkillModalOpen} 
        onClose={() => setAddSkillModalOpen(false)} 
        onSuccess={(newSkill: CandidateSkill) => {
          setCandidateSkills(prev => [...prev, newSkill]);
          setAddSkillModalOpen(false);
        }}
      />

      <ProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setProjectModalOpen(false)} 
        project={editingProject}
        onSuccess={() => {
          loadData(); // Refresh list to get fresh data
          setProjectModalOpen(false);
        }}
      />

      <DeleteProjectModal 
        isOpen={isDeleteProjectModalOpen} 
        onClose={() => setDeleteProjectModalOpen(false)}
        project={projectToDelete}
        onSuccess={() => {
          if (projectToDelete) {
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
          }
          setDeleteProjectModalOpen(false);
        }}
      />

      <AddProjectSkillModal
        isOpen={isAddProjectSkillModalOpen}
        onClose={() => setAddProjectSkillModalOpen(false)}
        project={projectToAddSkillTo}
        onSuccess={(newProjectSkill: ProjectSkill) => {
          setProjects(prev => prev.map(p => {
            if (p.id === projectToAddSkillTo?.id) {
              return { ...p, projectSkills: [...p.projectSkills, newProjectSkill] };
            }
            return p;
          }));
          setAddProjectSkillModalOpen(false);
        }}
      />
    </div>
  );
}

// --- Sub Components ---

function AddSkillModal({ isOpen, onClose, onSuccess }: any) {
  const [skillName, setSkillName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // In a real app we'd fetch the global dictionary to power an autocomplete,
  // but keeping it simple with a text input per requirements without overengineering
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetchApi('/profile/skills', {
        method: 'POST',
        body: JSON.stringify({ skillName }),
      });
      onSuccess(res.candidateSkill);
      setSkillName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add skill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Verified Skill">
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        <Input 
          label="Skill Name" 
          value={skillName} 
          onChange={(e) => setSkillName(e.target.value)} 
          placeholder="e.g. React, Node.js, Python"
          required 
        />
        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Skill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectModal({ isOpen, onClose, project, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    githubUrl: '',
    liveUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        githubUrl: project.githubUrl || '',
        liveUrl: project.liveUrl || '',
      });
    } else {
      setFormData({ name: '', description: '', githubUrl: '', liveUrl: '' });
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      githubUrl: formData.githubUrl || undefined,
      liveUrl: formData.liveUrl || undefined,
    };

    try {
      if (project) {
        await fetchApi(`/profile/projects/${project.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/profile/projects', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'Add Project'}>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        
        <Input 
          label="Project Name" 
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          placeholder="e.g. CyberCop"
          required 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a1a1a' }}>Description</label>
          <textarea 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            style={styles.textarea}
            placeholder="What did you build and why?"
            required
            rows={4}
          />
        </div>

        <Input 
          label="GitHub URL (Optional)" 
          type="url"
          value={formData.githubUrl} 
          onChange={(e) => setFormData({...formData, githubUrl: e.target.value})} 
          placeholder="https://github.com/username/repo"
        />

        <Input 
          label="Live Demo URL (Optional)" 
          type="url"
          value={formData.liveUrl} 
          onChange={(e) => setFormData({...formData, liveUrl: e.target.value})} 
          placeholder="https://myapp.com"
        />

        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : (project ? 'Save Changes' : 'Add Project')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteProjectModal({ isOpen, onClose, project, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      await fetchApi(`/profile/projects/${project.id}`, { method: 'DELETE' });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete project?">
      <div style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        <p style={{ color: '#52525b', fontSize: '0.9375rem' }}>
          This will permanently remove <strong>{project?.name}</strong> and its associated skills. This action cannot be undone.
        </p>
        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="button" variant="primary" onClick={handleDelete} disabled={loading} style={{ backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }}>
            {loading ? 'Deleting...' : 'Delete Project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddProjectSkillModal({ isOpen, onClose, project, onSuccess }: any) {
  const [skillName, setSkillName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim() || !project) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetchApi(`/profile/projects/${project.id}/skills`, {
        method: 'POST',
        body: JSON.stringify({ skillName }),
      });
      onSuccess(res.projectSkill);
      setSkillName('');
    } catch (err: any) {
      setError(err.message || 'Failed to attach skill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Skill to ${project?.name}`}>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        <Input 
          label="Skill Name" 
          value={skillName} 
          onChange={(e) => setSkillName(e.target.value)} 
          placeholder="e.g. MongoDB, WebSockets"
          required 
        />
        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Skill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    padding: '3rem',
    textAlign: 'center',
    color: '#52525b',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3rem',
    paddingBottom: '4rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#52525b',
    margin: 0,
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    border: '1px solid #fee2e2',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '0.875rem',
    color: '#52525b',
    margin: 0,
  },
  emptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: '#52525b',
    fontSize: '0.9375rem',
  },
  skillsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    alignItems: 'center',
  },
  skillPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  removeSkillBtn: {
    background: 'none',
    border: 'none',
    color: '#a1a1aa',
    cursor: 'pointer',
    fontSize: '1.25rem',
    lineHeight: 1,
    padding: '0 0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  projectName: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: 0,
  },
  projectActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  actionBtnText: {
    background: 'none',
    border: 'none',
    color: '#52525b',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  projectDesc: {
    fontSize: '0.9375rem',
    color: '#52525b',
    lineHeight: 1.5,
    margin: '0 0 1rem 0',
  },
  projectLinks: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  projectLink: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#ea580c',
    textDecoration: 'none',
  },
  projectSkillsSection: {
    borderTop: '1px solid #e5e5e5',
    paddingTop: '1rem',
  },
  projectSkillsHeader: {
    marginBottom: '0.75rem',
  },
  projectSkillsTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  addProjectSkillBtn: {
    background: 'none',
    border: '1px dashed #e5e5e5',
    borderRadius: '100px',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#52525b',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    border: '1px solid #e5e5e5',
    fontSize: '0.9375rem',
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s',
    resize: 'vertical',
    fontFamily: 'inherit',
  }
};
