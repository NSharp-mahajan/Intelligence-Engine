'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  candidateSkills: CandidateSkill[];
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

interface LinkSkillToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillName: string | null;
  projects: Project[];
  onSuccess: () => void;
  onOpenCreateProject: () => void;
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
    case 'Developer Tools':
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
  const [activeTab, setActiveTab] = useState<'workspace' | 'matrix'>('workspace');

  // Modals
  const [isAddSkillModalOpen, setAddSkillModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [isAttachSkillModalOpen, setAttachSkillModalOpen] = useState(false);
  const [isLinkSkillModalOpen, setLinkSkillModalOpen] = useState(false);

  // Active selections
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToAddSkillTo, setProjectToAddSkillTo] = useState<Project | null>(null);
  const [skillToLink, setSkillToLink] = useState<string | null>(null);

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

  // Map of lowercase skill name -> array of project names backing it
  const skillEvidenceMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const project of projects) {
      for (const ps of project.projectSkills || []) {
        const key = ps.skill.name.toLowerCase();
        const existing = map.get(key) || [];
        if (!existing.includes(project.name)) {
          existing.push(project.name);
        }
        map.set(key, existing);
      }
    }
    return map;
  }, [projects]);

  // Candidate skills with linked project evidence
  const backedSkills = useMemo(() => {
    return candidateSkills.filter((cs) => {
      const key = cs.skill.name.toLowerCase();
      const projs = skillEvidenceMap.get(key);
      return projs && projs.length > 0;
    });
  }, [candidateSkills, skillEvidenceMap]);

  // Candidate skills missing linked project evidence
  const unbackedSkills = useMemo(() => {
    return candidateSkills.filter((cs) => {
      const key = cs.skill.name.toLowerCase();
      const projs = skillEvidenceMap.get(key);
      return !projs || projs.length === 0;
    });
  }, [candidateSkills, skillEvidenceMap]);

  // Group candidate skills into deterministic categories
  const categorizedSkills = useMemo(() => {
    const groups: Record<SkillCategoryGroup, CandidateSkill[]> = {
      'Programming Languages': [],
      'Frontend Development': [],
      'Backend Development': [],
      'AI & Machine Learning': [],
      'Databases': [],
      'Developer Tools': [],
      'Other': [],
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

  const activeCategoriesCount = useMemo(() => {
    return SKILL_CATEGORY_ORDER.filter((cat) => categorizedSkills[cat].length > 0).length;
  }, [categorizedSkills]);

  const existingSkillNames = useMemo(
    () => candidateSkills.map((cs) => cs.skill.name),
    [candidateSkills]
  );

  const evidenceCoveragePercentage =
    candidateSkills.length > 0
      ? Math.round((backedSkills.length / candidateSkills.length) * 100)
      : 0;

  // ─── Loading View ───────────────────────────────────────────────────────────

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
          <div style={styles.badgeRow}>
            <span style={styles.headerBadge}>Developer Portfolio & Verification</span>
          </div>
          <h1 style={styles.title}>Skills & Projects Workspace</h1>
          <p style={styles.subtitle}>
            Your verified technical evidence workspace. Demonstrating tangible project implementations alongside documented skills directly powers match confidence and early-career eligibility evaluation.
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
          <span style={styles.summaryLabel}>Total Skills Added</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryMetric}>
          <span style={styles.summaryValue}>{activeCategoriesCount} / 7</span>
          <span style={styles.summaryLabel}>Skill Categories</span>
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
              color: backedSkills.length > 0 ? '#15803d' : 'var(--text-primary)',
            }}
          >
            {backedSkills.length}
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

      {/* Navigation Tabs */}
      <div style={styles.tabsStrip}>
        <button
          type="button"
          onClick={() => setActiveTab('workspace')}
          style={{
            ...styles.tabButton,
            borderBottomColor: activeTab === 'workspace' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'workspace' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'workspace' ? 600 : 500,
          }}
        >
          Skills & Projects Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          style={{
            ...styles.tabButton,
            borderBottomColor: activeTab === 'matrix' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'matrix' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'matrix' ? 600 : 500,
          }}
        >
          Evidence Mapping Matrix ({backedSkills.length} linked · {unbackedSkills.length} missing)
        </button>
      </div>

      {activeTab === 'workspace' ? (
        <>
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
                {candidateSkills.length > 3 && (
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
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSkillToLink(cs.skill.name);
                                        setLinkSkillModalOpen(true);
                                      }}
                                      style={styles.linkSkillPromptBtn}
                                      title="Link this skill to a project to provide concrete evidence"
                                    >
                                      + Link Project
                                    </button>
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
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.75">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                </div>
                <h3 style={styles.projectEmptyHeading}>Showcase what you&apos;ve built.</h3>
                <p style={styles.projectEmptyBody}>
                  Projects provide concrete technical evidence that Intelligence-Engine uses to verify your practical implementation experience. Opportunities look for demonstrated execution rather than self-reported keywords.
                </p>

                <div style={styles.projectPrepGuide}>
                  <div style={styles.prepGuideTitle}>What to prepare for each project:</div>
                  <ul style={styles.prepGuideList}>
                    <li>A clear title and concise summary of the architectural problem solved</li>
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
                            <span style={styles.projectMetaCount}>
                              {projectSkills.length} {projectSkills.length === 1 ? 'skill demonstrated' : 'skills demonstrated'}
                            </span>
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
        </>
      ) : (
        /* ─── 4. Skill-to-Project Evidence Mapping Section (Phase 6) ────────── */
        <section style={styles.section} aria-label="Evidence Mapping Matrix">
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionHeading}>Skill-to-Project Evidence Mapping</h2>
              <p style={styles.sectionSubtext}>
                Transparent breakdown showing which technical skills are reinforced by tangible project codebases, and which require evidence to improve opportunity match scores.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('workspace')}
            >
              ← Back to Workspace
            </Button>
          </div>

          <div style={styles.matrixGrid}>
            {/* Left: Skills Supported by Projects */}
            <div style={styles.matrixColumn}>
              <div style={styles.matrixColumnHeader}>
                <div style={styles.matrixHeaderRow}>
                  <span style={styles.verifiedDot} />
                  <h3 style={styles.matrixColumnTitle}>Supported by Project Evidence</h3>
                </div>
                <span style={styles.matrixBadgeSuccess}>{backedSkills.length} skills</span>
              </div>
              <p style={styles.matrixColumnSub}>
                These skills are verified in project repositories and provide strong match confidence.
              </p>

              {backedSkills.length === 0 ? (
                <div style={styles.matrixEmptyState}>
                  <p style={styles.matrixEmptyText}>
                    No skills linked to projects yet. Attach skills to your projects above to populate verified evidence.
                  </p>
                </div>
              ) : (
                <div style={styles.matrixItemsList}>
                  {backedSkills.map((cs) => {
                    const projectNames = skillEvidenceMap.get(cs.skill.name.toLowerCase()) || [];
                    return (
                      <div key={cs.skillId} style={styles.matrixEvidenceItem}>
                        <div style={styles.matrixItemHeader}>
                          <span style={styles.matrixSkillName}>{cs.skill.name}</span>
                          <span style={styles.matrixCategoryBadge}>
                            {categorizeSkill(cs.skill.name, cs.skill.category)}
                          </span>
                        </div>
                        <div style={styles.matrixCitationList}>
                          <span style={styles.matrixCitationLabel}>Demonstrated in:</span>
                          <div style={styles.matrixProjectTags}>
                            {projectNames.map((pName) => (
                              <span key={pName} style={styles.matrixProjectTag}>
                                📁 {pName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Skills Without Project Evidence */}
            <div style={styles.matrixColumn}>
              <div style={styles.matrixColumnHeader}>
                <div style={styles.matrixHeaderRow}>
                  <span style={styles.unverifiedDot} />
                  <h3 style={styles.matrixColumnTitle}>Skills Awaiting Evidence</h3>
                </div>
                <span style={styles.matrixBadgeWarning}>{unbackedSkills.length} skills</span>
              </div>
              <p style={styles.matrixColumnSub}>
                Documented in your inventory, but not yet linked to any project codebase.
              </p>

              {unbackedSkills.length === 0 ? (
                <div style={styles.matrixEmptyStateSuccess}>
                  <div style={styles.successCheckCircle}>✓</div>
                  <h4 style={styles.successHeading}>100% Evidence Coverage</h4>
                  <p style={styles.matrixEmptyText}>
                    All your documented skills are backed by tangible project implementations.
                  </p>
                </div>
              ) : (
                <div style={styles.matrixItemsList}>
                  {unbackedSkills.map((cs) => {
                    return (
                      <div key={cs.skillId} style={styles.matrixMissingItem}>
                        <div style={styles.matrixItemHeader}>
                          <div>
                            <span style={styles.matrixSkillName}>{cs.skill.name}</span>
                            <span style={styles.matrixCategoryBadge}>
                              {categorizeSkill(cs.skill.name, cs.skill.category)}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSkillToLink(cs.skill.name);
                              setLinkSkillModalOpen(true);
                            }}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            + Link to Project
                          </Button>
                        </div>
                        <p style={styles.missingEvidenceHint}>
                          Linking this skill to a project demonstrates practical experience to recruiters and semantic JD matchers.
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Project Contribution Summary */}
          <div style={styles.projectContributionSection}>
            <h3 style={styles.projectContributionTitle}>Project Portfolio Evidence Breakdown</h3>
            <p style={styles.projectContributionSub}>
              Summary of all skills backed by each of your active projects.
            </p>

            {projects.length === 0 ? (
              <div style={styles.matrixEmptyState}>
                <p style={styles.matrixEmptyText}>No projects in portfolio.</p>
              </div>
            ) : (
              <div style={styles.projectContributionsGrid}>
                {projects.map((project) => {
                  const projectSkills = project.projectSkills || [];
                  return (
                    <div key={project.id} style={styles.projectContributionCard}>
                      <div style={styles.projectContributionHeader}>
                        <h4 style={styles.projectContributionName}>{project.name}</h4>
                        <span style={styles.projectSkillCountBadge}>
                          {projectSkills.length} skills
                        </span>
                      </div>
                      <p style={styles.projectContributionDesc}>{project.description}</p>
                      <div style={styles.projectContributionSkills}>
                        {projectSkills.length === 0 ? (
                          <span style={styles.noSkillsAttachedSmall}>No skills attached</span>
                        ) : (
                          projectSkills.map((ps) => (
                            <span key={ps.skillId} style={styles.projectContributionSkillPill}>
                              {ps.skill.name}
                            </span>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProjectToAddSkillTo(project);
                          setAttachSkillModalOpen(true);
                        }}
                        style={styles.addMoreSkillsToProjLink}
                      >
                        + Attach more skills to {project.name}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── 5. Modals ──────────────────────────────────────────────────────── */}

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
        candidateSkills={candidateSkills}
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

      {/* Link Skill to Project Modal */}
      <LinkSkillToProjectModal
        isOpen={isLinkSkillModalOpen}
        onClose={() => {
          setLinkSkillModalOpen(false);
          setSkillToLink(null);
        }}
        skillName={skillToLink}
        projects={projects}
        onSuccess={() => {
          loadData();
          setLinkSkillModalOpen(false);
          setSkillToLink(null);
        }}
        onOpenCreateProject={() => {
          setLinkSkillModalOpen(false);
          setEditingProject(null);
          setProjectModalOpen(true);
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
      setSkillName('');
      onSuccess(res.candidateSkill);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add skill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Skill to Inventory">
      <form onSubmit={handleSubmit} style={styles.modalForm}>
        {error && <div style={styles.modalError}>{error}</div>}

        <div style={styles.modalFieldGroup}>
          <Input
            label="Skill Name"
            value={skillName}
            onChange={(e) => {
              setSkillName(e.target.value);
              setError('');
            }}
            placeholder="e.g. TypeScript, PyTorch, PostgreSQL, Docker..."
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

function ProjectModal({ isOpen, onClose, project, candidateSkills, onSuccess }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    githubUrl: '',
    liveUrl: '',
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
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
      setSelectedSkills((project.projectSkills || []).map((ps) => ps.skill.name));
    } else {
      setFormData({ name: '', description: '', githubUrl: '', liveUrl: '' });
      setSelectedSkills([]);
    }
    setError('');
  }, [project, isOpen]);

  const toggleSkillSelection = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

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
      let savedProject: Project;
      if (project) {
        const res = await fetchApi<{ project: Project }>(`/profile/projects/${project.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        savedProject = res.project;
      } else {
        const res = await fetchApi<{ project: Project }>('/profile/projects', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        savedProject = res.project;
      }

      // If creating a new project and skills were selected, attach them
      if (!project && selectedSkills.length > 0 && savedProject.id) {
        for (const skillName of selectedSkills) {
          try {
            await fetchApi(`/profile/projects/${savedProject.id}/skills`, {
              method: 'POST',
              body: JSON.stringify({ skillName }),
            });
          } catch {
            // Non-blocking attachment
          }
        }
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
          label="Project Title"
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

        {!project && candidateSkills.length > 0 && (
          <div style={styles.modalFieldGroup}>
            <label style={styles.textareaLabel}>
              Select Skills Implemented in This Project (Optional)
            </label>
            <div style={styles.selectSkillsGrid}>
              {candidateSkills.map((cs) => {
                const isSelected = selectedSkills.includes(cs.skill.name);
                return (
                  <button
                    key={cs.skillId}
                    type="button"
                    onClick={() => toggleSkillSelection(cs.skill.name)}
                    style={{
                      ...styles.selectSkillBtn,
                      backgroundColor: isSelected ? '#ea580c' : '#f5f5f4',
                      color: isSelected ? '#ffffff' : '#1c1917',
                      borderColor: isSelected ? '#ea580c' : '#e7e5e4',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {cs.skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Project Evidence">
      <div style={styles.modalForm}>
        {error && <div style={styles.modalError}>{error}</div>}
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Are you sure you want to delete <strong>{project?.name}</strong>? Any skill evidence links associated with this project will be removed.
        </p>
        <div style={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDelete}
            disabled={loading}
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          >
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

  const existingProjectSkills = useMemo(() => {
    if (!project?.projectSkills) return [];
    return project.projectSkills.map((ps) => ps.skill.name.toLowerCase());
  }, [project]);

  const candidateSkillsNotInProject = useMemo(() => {
    return candidateSkills.filter(
      (cs) => !existingProjectSkills.includes(cs.skill.name.toLowerCase())
    );
  }, [candidateSkills, existingProjectSkills]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const trimmed = skillName.trim();
    if (!trimmed) return;

    if (existingProjectSkills.includes(trimmed.toLowerCase())) {
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
      setSkillName('');
      onSuccess(res.projectSkill);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to attach skill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Attach Skill to ${project?.name || 'Project'}`}
    >
      <form onSubmit={handleSubmit} style={styles.modalForm}>
        {error && <div style={styles.modalError}>{error}</div>}

        <Input
          label="Skill Name"
          value={skillName}
          onChange={(e) => {
            setSkillName(e.target.value);
            setError('');
          }}
          placeholder="e.g. Next.js, Redis, PyTorch..."
          required
          autoFocus
        />

        {candidateSkillsNotInProject.length > 0 && (
          <div style={styles.modalFieldGroup}>
            <span style={styles.suggestionsLabel}>Select from your documented skills:</span>
            <div style={styles.suggestionsList}>
              {candidateSkillsNotInProject.slice(0, 8).map((cs) => (
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

function LinkSkillToProjectModal({
  isOpen,
  onClose,
  skillName,
  projects,
  onSuccess,
  onOpenCreateProject,
}: LinkSkillToProjectModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setError('');
  }, [projects, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName || !selectedProjectId) return;

    setLoading(true);
    setError('');

    try {
      await fetchApi(`/profile/projects/${selectedProjectId}/skills`, {
        method: 'POST',
        body: JSON.stringify({ skillName }),
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to link skill to project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Link "${skillName}" to a Project`}
    >
      {projects.length === 0 ? (
        <div style={styles.modalForm}>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
            You haven&apos;t added any projects to your portfolio yet. Add a project to link this skill and demonstrate verifiable evidence.
          </p>
          <div style={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={onOpenCreateProject}>
              + Create Project
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.modalForm}>
          {error && <div style={styles.modalError}>{error}</div>}

          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Select which project implements <strong>{skillName}</strong>. This provides verifiable evidence when semantic matching evaluates your profile.
          </p>

          <div style={styles.modalFieldGroup}>
            <label style={styles.textareaLabel}>Target Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={styles.selectInput}
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Linking…' : 'Link Skill to Project'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Inline Style Tokens (Matches Intelligence-Engine Design System) ─────────

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    backgroundColor: 'var(--bg-primary, #faf9f6)',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '1rem',
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e7e5e4',
    borderTopColor: '#ea580c',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '0.9375rem',
    color: '#78716c',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: '280px',
  },
  badgeRow: {
    marginBottom: '0.5rem',
  },
  headerBadge: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    border: '1px solid #ffedd5',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: 'var(--text-primary, #1c1917)',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary, #78716c)',
    margin: 0,
    lineHeight: 1.55,
    maxWidth: '780px',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStrip: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  summaryMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: '120px',
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1c1917',
    letterSpacing: '-0.02em',
  },
  summaryLabel: {
    fontSize: '0.8125rem',
    color: '#78716c',
    fontWeight: 500,
  },
  summaryDivider: {
    width: '1px',
    height: '36px',
    backgroundColor: '#e7e5e4',
  },
  tabsStrip: {
    display: 'flex',
    gap: '1.5rem',
    borderBottom: '1px solid #e7e5e4',
    paddingBottom: '0.25rem',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '0.5rem 0.25rem 0.75rem 0.25rem',
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  sectionHeading: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1c1917',
    margin: '0 0 0.25rem 0',
  },
  sectionSubtext: {
    fontSize: '0.875rem',
    color: '#78716c',
    margin: 0,
    lineHeight: 1.45,
  },
  skillsControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: '#a8a29e',
    pointerEvents: 'none',
  },
  searchInput: {
    padding: '0.375rem 0.75rem 0.375rem 2.25rem',
    fontSize: '0.875rem',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1c1917',
    outline: 'none',
    width: '200px',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    border: '1px dashed #d6d3d1',
    borderRadius: '10px',
    padding: '3rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.75rem',
  },
  emptyIconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fff7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.25rem',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1c1917',
    margin: 0,
  },
  emptyText: {
    fontSize: '0.875rem',
    color: '#78716c',
    maxWidth: '460px',
    margin: 0,
    lineHeight: 1.5,
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '1.25rem',
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '10px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryTitleGroup: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
  },
  categoryIconWrap: {
    color: '#ea580c',
    display: 'flex',
    alignItems: 'center',
    paddingTop: '0.125rem',
  },
  categoryNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  categoryName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1c1917',
    margin: 0,
  },
  categoryCountBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    backgroundColor: '#f5f5f4',
    color: '#78716c',
    padding: '0.1rem 0.45rem',
    borderRadius: '10px',
  },
  categoryDesc: {
    fontSize: '0.75rem',
    color: '#a8a29e',
    margin: '0.2rem 0 0 0',
    lineHeight: 1.4,
  },
  categoryEmptyState: {
    padding: '1rem 0',
    textAlign: 'center',
  },
  categoryEmptyText: {
    fontSize: '0.8125rem',
    color: '#a8a29e',
    fontStyle: 'italic',
  },
  skillsChipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  skillChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    padding: '0.35rem 0.65rem',
    fontSize: '0.8125rem',
    transition: 'all 0.15s ease',
  },
  skillChipInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  skillChipName: {
    fontWeight: 500,
    color: '#1c1917',
  },
  evidenceIndicatorBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
  },
  linkSkillPromptBtn: {
    background: 'none',
    border: 'none',
    color: '#ea580c',
    fontSize: '0.6875rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  removeChipButton: {
    background: 'none',
    border: 'none',
    color: '#a8a29e',
    fontSize: '1rem',
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    marginLeft: '0.25rem',
  },
  projectEmptyContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '12px',
    padding: '3rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  projectEmptyIllustration: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fff7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  projectEmptyHeading: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#1c1917',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.01em',
  },
  projectEmptyBody: {
    fontSize: '0.9375rem',
    color: '#78716c',
    maxWidth: '540px',
    margin: '0 0 1.5rem 0',
    lineHeight: 1.55,
  },
  projectPrepGuide: {
    backgroundColor: '#faf9f6',
    border: '1px solid #f5f5f4',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
    textAlign: 'left',
    maxWidth: '520px',
    width: '100%',
    marginBottom: '1.75rem',
  },
  prepGuideTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#1c1917',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  prepGuideList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.8125rem',
    color: '#78716c',
    lineHeight: 1.6,
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
    gap: '1.5rem',
  },
  projectCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '10px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
    color: '#1c1917',
    margin: '0 0 0.25rem 0',
    lineHeight: 1.3,
  },
  projectCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  projectMetaCount: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid #dcfce7',
  },
  projectCardActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  cardActionBtn: {
    background: 'none',
    border: 'none',
    fontSize: '0.8125rem',
    color: '#78716c',
    cursor: 'pointer',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
  },
  projectCardDescription: {
    fontSize: '0.875rem',
    color: '#44403c',
    margin: 0,
    lineHeight: 1.55,
  },
  projectLinksRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    paddingTop: '0.25rem',
  },
  projectLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#ea580c',
    textDecoration: 'none',
  },
  projectSkillsBox: {
    borderTop: '1px solid #f5f5f4',
    paddingTop: '0.875rem',
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
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#78716c',
  },
  attachSkillLink: {
    background: 'none',
    border: 'none',
    color: '#ea580c',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  noSkillsAttachedText: {
    fontSize: '0.8125rem',
    color: '#a8a29e',
    fontStyle: 'italic',
  },
  projectSkillsChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  projectSkillTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    backgroundColor: '#f5f5f4',
    border: '1px solid #e7e5e4',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.75rem',
    color: '#1c1917',
    fontWeight: 500,
  },
  removeProjectSkillCross: {
    background: 'none',
    border: 'none',
    color: '#a8a29e',
    fontSize: '0.875rem',
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },

  // ─── Evidence Matrix Styles ───────────────────────────────────────────────
  matrixGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
  },
  matrixColumn: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '10px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  matrixColumnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  verifiedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#15803d',
  },
  unverifiedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ea580c',
  },
  matrixColumnTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1c1917',
    margin: 0,
  },
  matrixBadgeSuccess: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '0.15rem 0.5rem',
    borderRadius: '10px',
  },
  matrixBadgeWarning: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    padding: '0.15rem 0.5rem',
    borderRadius: '10px',
  },
  matrixColumnSub: {
    fontSize: '0.8125rem',
    color: '#78716c',
    margin: 0,
    lineHeight: 1.45,
  },
  matrixEmptyState: {
    padding: '2rem 1rem',
    textAlign: 'center',
    backgroundColor: '#faf9f6',
    borderRadius: '8px',
    border: '1px dashed #e7e5e4',
  },
  matrixEmptyStateSuccess: {
    padding: '2rem 1rem',
    textAlign: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  successCheckCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#15803d',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
  },
  successHeading: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#15803d',
    margin: 0,
  },
  matrixEmptyText: {
    fontSize: '0.8125rem',
    color: '#78716c',
    margin: 0,
    lineHeight: 1.4,
  },
  matrixItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: '480px',
    overflowY: 'auto',
  },
  matrixEvidenceItem: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '0.875rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  matrixMissingItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '8px',
    padding: '0.875rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  matrixItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixSkillName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1c1917',
    marginRight: '0.5rem',
  },
  matrixCategoryBadge: {
    fontSize: '0.6875rem',
    color: '#78716c',
    backgroundColor: '#f5f5f4',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
  },
  matrixCitationList: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  matrixCitationLabel: {
    fontSize: '0.75rem',
    color: '#15803d',
    fontWeight: 600,
  },
  matrixProjectTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  matrixProjectTag: {
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: '#ffffff',
    border: '1px solid #86efac',
    color: '#166534',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
  },
  missingEvidenceHint: {
    fontSize: '0.75rem',
    color: '#78716c',
    margin: 0,
    lineHeight: 1.4,
  },
  projectContributionSection: {
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    borderRadius: '10px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  projectContributionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#1c1917',
    margin: 0,
  },
  projectContributionSub: {
    fontSize: '0.8125rem',
    color: '#78716c',
    margin: '0 0 1rem 0',
  },
  projectContributionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem',
  },
  projectContributionCard: {
    backgroundColor: '#faf9f6',
    border: '1px solid #e7e5e4',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  projectContributionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectContributionName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1c1917',
    margin: 0,
  },
  projectSkillCountBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
  },
  projectContributionDesc: {
    fontSize: '0.8125rem',
    color: '#57534e',
    margin: 0,
    lineHeight: 1.45,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  projectContributionSkills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.25rem',
    marginTop: '0.25rem',
  },
  projectContributionSkillPill: {
    fontSize: '0.6875rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e7e5e4',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    color: '#1c1917',
  },
  noSkillsAttachedSmall: {
    fontSize: '0.75rem',
    color: '#a8a29e',
    fontStyle: 'italic',
  },
  addMoreSkillsToProjLink: {
    background: 'none',
    border: 'none',
    color: '#ea580c',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
    marginTop: '0.25rem',
  },

  // ─── Modal Styles ─────────────────────────────────────────────────────────
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  modalError: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.625rem 0.875rem',
    borderRadius: '6px',
    fontSize: '0.8125rem',
  },
  modalFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  suggestionsBox: {
    backgroundColor: '#faf9f6',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  suggestionsLabel: {
    fontSize: '0.75rem',
    color: '#78716c',
    fontWeight: 500,
  },
  suggestionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  suggestionItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #d6d3d1',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    color: '#1c1917',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modalHelpText: {
    fontSize: '0.8125rem',
    color: '#78716c',
    margin: 0,
    lineHeight: 1.45,
  },
  textareaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  textareaLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#1c1917',
  },
  textarea: {
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1c1917',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    resize: 'vertical',
  },
  selectInput: {
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #e7e5e4',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1c1917',
    outline: 'none',
    fontFamily: 'inherit',
  },
  selectSkillsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    maxHeight: '140px',
    overflowY: 'auto',
    padding: '0.25rem',
    border: '1px solid #f5f5f4',
    borderRadius: '6px',
  },
  selectSkillBtn: {
    border: '1px solid #e7e5e4',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
};
