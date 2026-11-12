'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import {
  categorizeSkill,
  SKILL_CATEGORY_ORDER,
  CATEGORY_DESCRIPTIONS,
  SkillCategoryGroup,
} from '../../../lib/skillCategories';
import type {
  CandidateSkill,
  Project,
  ProjectSkill,
  CandidateSkillsResponse,
  ProjectsResponse,
  Skill,
} from '../../../lib/types';

// ─── Modal Prop Interfaces ───────────────────────────────────────────────────

interface AddSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSkillNames: string[];
  allAvailableSkills: Skill[];
  onSuccess: (skill: CandidateSkill) => void;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess: () => void;
}

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess: () => void;
}

interface AttachProjectSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  candidateSkills: CandidateSkill[];
  onSuccess: (skill: ProjectSkill) => void;
}

// ─── Category Icon Helper ────────────────────────────────────────────────────

function getCategoryIcon(category: SkillCategoryGroup) {
  switch (category) {
    case 'Programming Languages':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'Frontend Development':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'Backend Development':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="8" rx="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      );
    case 'AI & Machine Learning':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a8 8 0 0 0-8 8c0 3 2 5.5 5 7v3h6v-3c3-1.5 5-4 5-7a8 8 0 0 0-8-8z" />
          <line x1="10" y1="22" x2="14" y2="22" />
        </svg>
      );
    case 'Databases':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'Developer Tools & Cloud':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
}

// ─── Main Evidence Page Component ─────────────────────────────────────────────

export default function EvidencePage() {
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');

  // Modals
  const [isAddSkillModalOpen, setAddSkillModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [isAttachSkillModalOpen, setAttachSkillModalOpen] = useState(false);

  // Active selections
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
      const [skillsRes, projectsRes, allSkillsRes] = await Promise.all([
        fetchApi<CandidateSkillsResponse>('/profile/skills'),
        fetchApi<ProjectsResponse>('/profile/projects'),
        fetchApi<{ skills: Skill[] }>('/skills').catch(() => ({ skills: [] })),
      ]);
      setCandidateSkills(skillsRes.candidateSkills || []);
      setProjects(projectsRes.projects || []);
      setAvailableSkills(allSkillsRes.skills || []);
    } catch {
      setError('Unable to load your career evidence. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Skill Removal Handlers ─────────────────────────────────────────────────

  const handleRemoveSkill = async (skillId: string) => {
    try {
      await fetchApi(`/profile/skills/${skillId}`, { method: 'DELETE' });
      setCandidateSkills((prev) => prev.filter((s) => s.skillId !== skillId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove skill');
    }
  };

  const handleRemoveProjectSkill = async (projectId: string, skillId: string) => {
    try {
      await fetchApi(`/profile/projects/${projectId}/skills/${skillId}`, { method: 'DELETE' });
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            return { ...p, projectSkills: p.projectSkills.filter((s) => s.skillId !== skillId) };
          }
          return p;
        })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove skill from project');
    }
  };

  // ─── Evidence Relationship Computation ──────────────────────────────────────

  // Map of skillId (or lowercased skill name) to array of project names backing it
  const skillEvidenceMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const project of projects) {
      for (const ps of project.projectSkills || []) {
        const key = ps.skill.name.toLowerCase();
        const existing = map.get(key) || [];
        existing.push(project.name);
        map.set(key, existing);
      }
    }
    return map;
  }, [projects]);

  // Count of candidate skills supported by project evidence
  const evidenceBackedSkillsCount = useMemo(() => {
    return candidateSkills.filter((cs) => {
      const key = cs.skill.name.toLowerCase();
      const projs = skillEvidenceMap.get(key);
      return projs && projs.length > 0;
    }).length;
  }, [candidateSkills, skillEvidenceMap]);

  // Group candidate skills into deterministic categories
  const categorizedSkills = useMemo(() => {
    const groups: Record<SkillCategoryGroup, CandidateSkill[]> = {
      'Programming Languages': [],
      'Frontend Development': [],
      'Backend Development': [],
      'AI & Machine Learning': [],
      'Databases': [],
      'Developer Tools & Cloud': [],
      'Other Skills': [],
    };

    const query = skillSearchQuery.trim().toLowerCase();

    for (const cs of candidateSkills) {
      if (query && !cs.skill.name.toLowerCase().includes(query)) {
        continue;
      }
      const category = categorizeSkill(cs.skill.name, cs.skill.category);
      groups[category].push(cs);
    }

    return groups;
  }, [candidateSkills, skillSearchQuery]);

  const existingSkillNames = useMemo(
    () => candidateSkills.map((cs) => cs.skill.name),
    [candidateSkills]
  );

  const evidenceCoveragePercentage =
    candidateSkills.length > 0
      ? Math.round((evidenceBackedSkillsCount / candidateSkills.length) * 100)
      : 0;

  // ─── Loading & Error Views ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Loading career evidence workspace…</span>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer} className="animate-fade-in">

      {/* ─── 1. Header & Overview Strip ─────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <h1 style={styles.title}>Skills & Projects</h1>
          <p style={styles.subtitle}>
            Your verified technical evidence workspace. Demonstrating verifiable project implementations alongside documented skills directly powers match confidence and early-career eligibility evaluation.
          </p>
        </div>
        <div style={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddSkillModalOpen(true)}
          >
            + Add Skill
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingProject(null);
              setProjectModalOpen(true);
            }}
          >
            + Add Project
          </Button>
        </div>
      </header>

      {error && (
        <div style={styles.errorAlert}>
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div style={styles.summaryStrip}>
        <div style={styles.summaryMetric}>
          <span style={styles.summaryValue}>{candidateSkills.length}</span>
          <span style={styles.summaryLabel}>Documented Skills</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryMetric}>
          <span style={styles.summaryValue}>{projects.length}</span>
          <span style={styles.summaryLabel}>Projects Added</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryMetric}>
          <span
            style={{
              ...styles.summaryValue,
              color: evidenceBackedSkillsCount > 0 ? '#15803d' : 'var(--text-primary)',
            }}
          >
            {evidenceBackedSkillsCount}
          </span>
          <span style={styles.summaryLabel}>Skills with Project Evidence</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryMetric}>
          <span
            style={{
              ...styles.summaryValue,
              color: evidenceCoveragePercentage >= 50 ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {evidenceCoveragePercentage}%
          </span>
          <span style={styles.summaryLabel}>Evidence Coverage</span>
        </div>
      </div>

      {/* ─── 2. Skills Workspace Section ───────────────────────────────────── */}
      <section style={styles.section} aria-label="Skills Inventory">
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionHeading}>Skills Inventory</h2>
            <p style={styles.sectionSubtext}>
              Categorized technical skills. Skills attached to active projects carry verified evidence flags.
            </p>
          </div>
          <div style={styles.skillsControls}>
            {candidateSkills.length > 5 && (
              <div style={styles.searchWrapper}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.searchIcon}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter skills..."
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddSkillModalOpen(true)}
            >
              + Add Skill
            </Button>
          </div>
        </div>

        {candidateSkills.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyIconCircle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>No skills documented yet</h3>
            <p style={styles.emptyText}>
              Document the programming languages, frameworks, and developer tools you know. The engine matches these skills against opportunity requirements.
            </p>
            <Button variant="primary" size="sm" onClick={() => setAddSkillModalOpen(true)}>
              + Add Your First Skill
            </Button>
          </div>
        ) : (
          <div style={styles.categoriesGrid}>
            {SKILL_CATEGORY_ORDER.map((category) => {
              const skills = categorizedSkills[category];
              if (skills.length === 0 && skillSearchQuery) return null;

              return (
                <div key={category} style={styles.categoryCard}>
                  <div style={styles.categoryHeader}>
                    <div style={styles.categoryTitleGroup}>
                      <span style={styles.categoryIconWrap}>
                        {getCategoryIcon(category)}
                      </span>
                      <div>
                        <div style={styles.categoryNameRow}>
                          <h3 style={styles.categoryName}>{category}</h3>
                          <span style={styles.categoryCountBadge}>{skills.length}</span>
                        </div>
                        <p style={styles.categoryDesc}>
                          {CATEGORY_DESCRIPTIONS[category]}
                        </p>
                      </div>
                    </div>
                  </div>

                  {skills.length === 0 ? (
                    <div style={styles.categoryEmptyState}>
                      <span style={styles.categoryEmptyText}>No skills in this category yet.</span>
                    </div>
                  ) : (
                    <div style={styles.skillsChipContainer}>
                      {skills.map((cs) => {
                        const backingProjects = skillEvidenceMap.get(cs.skill.name.toLowerCase()) || [];
                        const isBacked = backingProjects.length > 0;

                        return (
                          <div
                            key={cs.skillId}
                            style={{
                              ...styles.skillChip,
                              borderColor: isBacked ? '#bbf7d0' : 'var(--border-light)',
                              backgroundColor: isBacked ? '#f0fdf4' : 'var(--bg-surface)',
                            }}
                          >
                            <div style={styles.skillChipInfo}>
                              <span style={styles.skillChipName}>{cs.skill.name}</span>
                              {isBacked ? (
                                <span
                                  style={styles.evidenceIndicatorBadge}
                                  title={`Demonstrated in: ${backingProjects.join(', ')}`}
                                >
                                  ✓ in {backingProjects.length} {backingProjects.length === 1 ? 'project' : 'projects'}
                                </span>
                              ) : (
                                <span style={styles.unsupportedBadge}>
                                  No project yet
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(cs.skillId)}
                              style={styles.removeChipButton}
                              aria-label={`Remove ${cs.skill.name}`}
                              title={`Remove ${cs.skill.name}`}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 3. Project Portfolio Section ──────────────────────────────────── */}
      <section style={styles.section} aria-label="Project Portfolio">
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionHeading}>Project Portfolio</h2>
            <p style={styles.sectionSubtext}>
              Real-world systems, client applications, and open-source contributions demonstrating what you build.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingProject(null);
              setProjectModalOpen(true);
            }}
          >
            + Add Project
          </Button>
        </div>

        {projects.length === 0 ? (
          /* Single Well-Designed Empty State */
          <div style={styles.projectEmptyContainer}>
            <div style={styles.projectEmptyIllustration}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.75">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <h3 style={styles.projectEmptyHeading}>No project evidence added yet</h3>
            <p style={styles.projectEmptyBody}>
              Projects are the primary evidence Intelligence-Engine uses to verify your practical implementation skills. Opportunities look for demonstrated experience rather than self-reported keywords.
            </p>

            <div style={styles.projectPrepGuide}>
              <div style={styles.prepGuideTitle}>What to prepare for each project:</div>
              <ul style={styles.prepGuideList}>
                <li>A clear name and concise summary of the problem solved</li>
                <li>Public repository URL (GitHub, GitLab) or live deployment demo</li>
                <li>The specific technologies, libraries, and frameworks you implemented</li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingProject(null);
                setProjectModalOpen(true);
              }}
              style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }}
            >
              + Add Your First Project
            </Button>
          </div>
        ) : (
          /* Polished Responsive Project Cards Grid */
          <div style={styles.projectsGrid}>
            {projects.map((project) => {
              const projectSkills = project.projectSkills || [];

              return (
                <div key={project.id} style={styles.projectCard}>
                  {/* Card Top */}
                  <div style={styles.projectCardHeader}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={styles.projectCardTitle}>{project.name}</h3>
                      <div style={styles.projectCardMeta}>
                        <span>{projectSkills.length} skills demonstrated</span>
                      </div>
                    </div>
                    <div style={styles.projectCardActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProject(project);
                          setProjectModalOpen(true);
                        }}
                        style={styles.cardActionBtn}
                        title="Edit Project Details"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProjectToDelete(project);
                          setDeleteProjectModalOpen(true);
                        }}
                        style={{ ...styles.cardActionBtn, color: 'var(--error-text)' }}
                        title="Delete Project"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={styles.projectCardDescription}>{project.description}</p>

                  {/* External Links */}
                  {(project.githubUrl || project.liveUrl) && (
                    <div style={styles.projectLinksRow}>
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.projectLink}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                          </svg>
                          Repository ↗
                        </a>
                      )}
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.projectLink}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Live Demo ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* Demonstrated Skills Attachment Strip */}
                  <div style={styles.projectSkillsBox}>
                    <div style={styles.projectSkillsTitleRow}>
                      <span style={styles.projectSkillsLabel}>Demonstrated Skills:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setProjectToAddSkillTo(project);
                          setAttachSkillModalOpen(true);
                        }}
                        style={styles.attachSkillLink}
                      >
                        + Attach Skill
                      </button>
                    </div>

                    {projectSkills.length === 0 ? (
                      <span style={styles.noSkillsAttachedText}>
                        No skills attached yet. Attach skills to provide verifiable evidence.
                      </span>
                    ) : (
                      <div style={styles.projectSkillsChipsRow}>
                        {projectSkills.map((ps) => (
                          <span key={ps.skillId} style={styles.projectSkillTag}>
                            {ps.skill.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveProjectSkill(project.id, ps.skillId)}
                              style={styles.removeProjectSkillCross}
                              title={`Remove ${ps.skill.name} from project`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 4. Modals ──────────────────────────────────────────────────────── */}

      {/* Add Skill Modal */}
      <AddSkillModal
        isOpen={isAddSkillModalOpen}
        onClose={() => setAddSkillModalOpen(false)}
        existingSkillNames={existingSkillNames}
        allAvailableSkills={availableSkills}
        onSuccess={(newSkill: CandidateSkill) => {
          setCandidateSkills((prev) => [...prev, newSkill]);
          setAddSkillModalOpen(false);
        }}
      />

      {/* Add / Edit Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={editingProject}
        onSuccess={() => {
          loadData();
          setProjectModalOpen(false);
        }}
      />

      {/* Delete Project Modal */}
      <DeleteProjectModal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => setDeleteProjectModalOpen(false)}
        project={projectToDelete}
        onSuccess={() => {
          if (projectToDelete) {
            setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
          }
          setDeleteProjectModalOpen(false);
        }}
      />

      {/* Attach Skill to Project Modal */}
      <AttachProjectSkillModal
        isOpen={isAttachSkillModalOpen}
        onClose={() => setAttachSkillModalOpen(false)}
        project={projectToAddSkillTo}
        candidateSkills={candidateSkills}
        onSuccess={(newProjectSkill: ProjectSkill) => {
          setProjects((prev) =>
            prev.map((p) => {
              if (p.id === projectToAddSkillTo?.id) {
                return {
                  ...p,
                  projectSkills: [...(p.projectSkills || []), newProjectSkill],
                };
              }
              return p;
            })
          );
          setAttachSkillModalOpen(false);
        }}
      />
    </div>
  );
}

// ─── Modal Subcomponents ──────────────────────────────────────────────────────

function AddSkillModal({
  isOpen,
  onClose,
  existingSkillNames,
  allAvailableSkills,
  onSuccess,
}: AddSkillModalProps) {
  const [skillName, setSkillName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestedSkills = useMemo(() => {
    if (!skillName.trim()) return [];
    const query = skillName.toLowerCase();
    return allAvailableSkills
      .filter(
        (s) =>
          s.name.toLowerCase().includes(query) &&
          !existingSkillNames.some((e) => e.toLowerCase() === s.name.toLowerCase())
      )
      .slice(0, 5);
  }, [skillName, allAvailableSkills, existingSkillNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = skillName.trim();
    if (!trimmed) return;

    if (existingSkillNames.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already in your skills inventory.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ candidateSkill: CandidateSkill }>('/profile/skills', {
        method: 'POST',
        body: JSON.stringify({ skillName: trimmed }),
      });
      onSuccess(res.candidateSkill);
      setSkillName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add skill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Verified Technical Skill">
      <form onSubmit={handleSubmit} style={styles.modalForm}>
        {error && <div style={styles.modalError}>{error}</div>}

        <div>
          <Input
            label="Skill Name"
            value={skillName}
            onChange={(e) => {
              setSkillName(e.target.value);
              setError('');
            }}
            placeholder="e.g. TypeScript, PyTorch, Docker, PostgreSQL"
            required
            autoFocus
          />

          {suggestedSkills.length > 0 && (
            <div style={styles.suggestionsBox}>
              <span style={styles.suggestionsLabel}>Platform catalog matches:</span>
              <div style={styles.suggestionsList}>
                {suggestedSkills.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSkillName(s.name)}
                    style={styles.suggestionItem}
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p style={styles.modalHelpText}>
          Skills are automatically categorized into logical engineering tracks. Attach your skills to projects to generate verifiable proof for recruiters.
        </p>

        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding…' : 'Add to Inventory'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectModal({ isOpen, onClose, project, onSuccess }: ProjectModalProps) {
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
    setError('');
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Project name and description are required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      githubUrl: formData.githubUrl.trim() || undefined,
      liveUrl: formData.liveUrl.trim() || undefined,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project Evidence' : 'Add Project Evidence'}>
      <form onSubmit={handleSubmit} style={styles.modalForm}>
        {error && <div style={styles.modalError}>{error}</div>}

        <Input
          label="Project Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Distributed Task Queue, Multi-Modal Search Engine"
          required
        />

        <div style={styles.textareaContainer}>
          <label style={styles.textareaLabel}>
            Description & Technical Contribution <span style={{ color: 'var(--error-text)' }}>*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={styles.textarea}
            placeholder="Describe the architectural problem solved, key design choices, and what you personally built..."
            required
            rows={4}
          />
        </div>

        <Input
          label="GitHub / Repository URL (Optional)"
          type="url"
          value={formData.githubUrl}
          onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
          placeholder="https://github.com/username/project-repo"
        />

        <Input
          label="Live Demo / Deployment URL (Optional)"
          type="url"
          value={formData.liveUrl}
          onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
          placeholder="https://my-demo-app.vercel.app"
        />

        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteProjectModal({ isOpen, onClose, project, onSuccess }: DeleteProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!project) return;
    setLoading(true);
    setError('');

    try {
      await fetchApi(`/profile/projects/${project.id}`, { method: 'DELETE' });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Project Evidence">
      <div style={styles.modalForm}>
        {error && <div style={styles.modalError}>{error}</div>}
        <p style={styles.deleteWarningText}>
          Are you sure you want to remove <strong>{project?.name}</strong>?
          This will permanently delete the project and disassociate its attached skill evidence from your career profile.
        </p>
        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete Project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AttachProjectSkillModal({
  isOpen,
  onClose,
  project,
  candidateSkills,
  onSuccess,
}: AttachProjectSkillModalProps) {
  const [skillName, setSkillName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const projectExistingSkills = useMemo(() => {
    return (project?.projectSkills || []).map((ps) => ps.skill.name.toLowerCase());
  }, [project]);

  // Candidate skills that are NOT yet attached to this project
  const candidateAvailableSkills = useMemo(() => {
    return candidateSkills.filter(
      (cs) => !projectExistingSkills.includes(cs.skill.name.toLowerCase())
    );
  }, [candidateSkills, projectExistingSkills]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = skillName.trim();
    if (!trimmed || !project) return;

    if (projectExistingSkills.includes(trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already attached to this project.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchApi<{ projectSkill: ProjectSkill }>(
        `/profile/projects/${project.id}/skills`,
        {
          method: 'POST',
          body: JSON.stringify({ skillName: trimmed }),
        }
      );
      onSuccess(res.projectSkill);
      setSkillName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to attach skill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Attach Skill to ${project?.name || 'Project'}`}>
      <form onSubmit={handleSubmit} style={styles.modalForm}>
        {error && <div style={styles.modalError}>{error}</div>}

        <Input
          label="Skill Name"
          value={skillName}
          onChange={(e) => {
            setSkillName(e.target.value);
            setError('');
          }}
          placeholder="e.g. React, PostgreSQL, Docker"
          required
          autoFocus
        />

        {candidateAvailableSkills.length > 0 && (
          <div style={styles.suggestionsBox}>
            <span style={styles.suggestionsLabel}>Select from your documented skills:</span>
            <div style={styles.suggestionsList}>
              {candidateAvailableSkills.slice(0, 8).map((cs) => (
                <button
                  key={cs.skillId}
                  type="button"
                  onClick={() => setSkillName(cs.skill.name)}
                  style={styles.suggestionItem}
                >
                  + {cs.skill.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Attaching…' : 'Attach Skill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Design System Styles ─────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2.25rem',
    maxWidth: '1240px',
    margin: '0 auto',
    width: '100%',
  },

  loadingContainer: {
    minHeight: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.875rem',
  },
  loadingSpinner: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#e5e5e5',
    borderTopColor: 'var(--accent-primary)',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
    fontWeight: 500,
  },

  errorAlert: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '0.875rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--error-border)',
    fontSize: '0.875rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.25rem',
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: '280px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
    maxWidth: '780px',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Summary KPI Strip
  summaryStrip: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    padding: '1.25rem 2rem',
    flexWrap: 'wrap',
  },
  summaryMetric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
    minWidth: '140px',
    padding: '0.5rem 0',
  },
  summaryValue: {
    fontSize: '1.875rem',
    fontWeight: 750,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: '0.6875rem',
    fontWeight: 650,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'center',
  },
  summaryDivider: {
    width: '1px',
    height: '36px',
    backgroundColor: 'var(--border-light)',
    flexShrink: 0,
  },

  // Sections
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  sectionHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.25rem',
  },
  sectionSubtext: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  skillsControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    color: 'var(--text-tertiary)',
  },
  searchInput: {
    padding: '0.4375rem 0.75rem 0.4375rem 2rem',
    fontSize: '0.8125rem',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '180px',
  },

  // Categorized Skills Grid
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1.25rem',
  },
  categoryCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryTitleGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  categoryIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: '#ffedd5',
    color: '#ea580c',
    flexShrink: 0,
  },
  categoryNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  categoryName: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  categoryCountBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    backgroundColor: '#f4f4f5',
    color: 'var(--text-secondary)',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
  },
  categoryDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    margin: '0.125rem 0 0 0',
    lineHeight: 1.4,
  },
  categoryEmptyState: {
    padding: '1.25rem 0',
    textAlign: 'center',
  },
  categoryEmptyText: {
    fontSize: '0.8125rem',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },

  // Skill Chips
  skillsChipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  skillChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.625rem',
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    transition: 'all 150ms ease',
  },
  skillChipInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  skillChipName: {
    fontSize: '0.8125rem',
    fontWeight: 650,
    color: 'var(--text-primary)',
  },
  evidenceIndicatorBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
  },
  unsupportedBadge: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
  },
  removeChipButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: '0 2px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State (Skills)
  emptyContainer: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    padding: '3rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '0.875rem',
  },
  emptyIconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.25rem',
  },
  emptyTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    maxWidth: '440px',
    margin: 0,
  },

  // Empty State (Projects)
  projectEmptyContainer: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    padding: '3.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '1rem',
  },
  projectEmptyIllustration: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    backgroundColor: '#ffedd5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.25rem',
  },
  projectEmptyHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  projectEmptyBody: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
    maxWidth: '560px',
    margin: 0,
  },
  projectPrepGuide: {
    backgroundColor: 'var(--bg-primary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '1.125rem 1.5rem',
    textAlign: 'left',
    maxWidth: '520px',
    width: '100%',
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
  },
  prepGuideTitle: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  prepGuideList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },

  // Projects Grid & Cards
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '1.5rem',
  },
  projectCard: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  projectCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  projectCardTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  projectCardMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    marginTop: '0.25rem',
  },
  projectCardActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardActionBtn: {
    background: 'none',
    border: '1px solid var(--border-light)',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 150ms ease',
  },
  projectCardDescription: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
    margin: 0,
    flex: 1,
  },
  projectLinksRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: '0.25rem',
  },
  projectLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--accent-primary)',
    textDecoration: 'none',
  },
  projectSkillsBox: {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    padding: '0.875rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  projectSkillsTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectSkillsLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  attachSkillLink: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '0.75rem',
    fontWeight: 650,
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  },
  noSkillsAttachedText: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  projectSkillsChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    alignItems: 'center',
  },
  projectSkillTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: '4px',
    padding: '0.1875rem 0.4375rem',
  },
  removeProjectSkillCross: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    lineHeight: 1,
    padding: 0,
    display: 'inline-flex',
  },

  // Modals
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  modalError: {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    padding: '0.625rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--error-border)',
  },
  modalHelpText: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    lineHeight: 1.45,
    margin: 0,
  },
  deleteWarningText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9375rem',
    lineHeight: 1.5,
    margin: 0,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  suggestionsBox: {
    marginTop: '-0.5rem',
    marginBottom: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  suggestionsLabel: {
    fontSize: '0.6875rem',
    fontWeight: 650,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  suggestionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  suggestionItem: {
    background: 'var(--bg-primary)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: '0.1875rem 0.4375rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 150ms ease',
  },
  textareaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  textareaLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  textarea: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border-light)',
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-surface)',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    resize: 'vertical',
  },
};
