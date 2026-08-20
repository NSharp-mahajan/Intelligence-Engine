'use client';

import { useState } from 'react';

export function EvidenceGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes = [
    { id: 'react', label: 'React', x: 200, y: 50 },
    { id: 'nodejs', label: 'Node.js', x: 600, y: 50 },
    { id: 'rest', label: 'REST APIs', x: 400, y: 150 },
    { id: 'evidence', label: 'Project Evidence', x: 400, y: 50, type: 'core' },
    { id: 'role', label: 'Software Engineer', x: 400, y: 250, type: 'target' },
  ];

  const edges = [
    { source: 'react', target: 'evidence' },
    { source: 'nodejs', target: 'evidence' },
    { source: 'evidence', target: 'rest' },
    { source: 'rest', target: 'role' },
  ];

  const getOpacity = (id: string) => {
    if (!hoveredNode) return 1;
    if (hoveredNode === id) return 1;
    // Check if connected
    const isConnected = edges.some(e => 
      (e.source === id && e.target === hoveredNode) || 
      (e.target === id && e.source === hoveredNode)
    );
    if (isConnected) return 1;
    // Special core connectivity
    if (hoveredNode === 'evidence' && (id === 'react' || id === 'nodejs' || id === 'rest')) return 1;
    if (id === 'evidence' && (hoveredNode === 'react' || hoveredNode === 'nodejs' || hoveredNode === 'rest')) return 1;
    
    return 0.2;
  };

  const getEdgeOpacity = (source: string, target: string) => {
    if (!hoveredNode) return 0.5;
    if (source === hoveredNode || target === hoveredNode) return 1;
    return 0.1;
  };

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Your skills should connect to evidence.</h2>
        <p style={styles.subtitle}>
          The Intelligence Engine maps your capabilities through verifiable project graphs.
        </p>
      </div>

      <div style={styles.graphContainer}>
        <svg viewBox="0 0 800 300" style={styles.svg}>
          {/* Edges */}
          {edges.map((edge, idx) => {
            const sourceNode = nodes.find(n => n.id === edge.source)!;
            const targetNode = nodes.find(n => n.id === edge.target)!;
            return (
              <line
                key={idx}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={getEdgeOpacity(edge.source, edge.target) === 1 ? 'var(--accent-primary)' : 'var(--border-light)'}
                strokeWidth={getEdgeOpacity(edge.source, edge.target) === 1 ? 3 : 2}
                opacity={getEdgeOpacity(edge.source, edge.target)}
                style={{ transition: 'all 0.3s ease' }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => (
            <g 
              key={node.id} 
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer', opacity: getOpacity(node.id), transition: 'opacity 0.3s ease' }}
            >
              <rect 
                x="-70" 
                y="-20" 
                width="140" 
                height="40" 
                rx="20"
                fill={node.type === 'core' ? 'var(--bg-dark)' : node.type === 'target' ? 'var(--accent-light)' : 'var(--bg-surface)'}
                stroke={node.type === 'target' ? 'var(--accent-primary)' : 'var(--border-light)'}
                strokeWidth="2"
              />
              <text 
                x="0" 
                y="5" 
                textAnchor="middle" 
                alignmentBaseline="middle"
                fontSize="14"
                fontWeight="700"
                fill={node.type === 'core' ? 'var(--text-inverse)' : node.type === 'target' ? 'var(--accent-hover)' : 'var(--text-primary)'}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '8rem 2rem',
    backgroundColor: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-light)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '4rem',
    maxWidth: '600px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  graphContainer: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-light)',
    padding: '2rem',
    boxShadow: 'var(--shadow-sm)',
  },
  svg: {
    width: '100%',
    height: '100%',
    display: 'block',
  }
};
