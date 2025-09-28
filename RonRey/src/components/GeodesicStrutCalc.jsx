import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Slide from '@mui/material/Slide';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';

const warmPalette = ['#ff6b6b', '#ffa94d', '#ffd43b', '#fab005', '#ff922b'];
const coolPalette = ['#74c0fc', '#4dabf7', '#3bc9db', '#69db7c', '#38d9a9'];

const norm = ([x, y, z]) => Math.hypot(x, y, z);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitVec = (v) => {
  const n = norm(v);
  return n ? [v[0] / n, v[1] / n, v[2] / n] : [0, 0, 0];
};

function icosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map(unitVec);
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  return { verts, faces };
}

function keyFor(v, q = 1e6) {
  return `${Math.round(v[0] * q)}_${Math.round(v[1] * q)}_${Math.round(v[2] * q)}`;
}

function subdivideFace(a, b, c, f) {
  const points = [];
  for (let i = 0; i <= f; i++) {
    for (let j = 0; j <= f - i; j++) {
      const k = f - i - j;
      const p = unitVec(add(add(mul(a, i / f), mul(b, j / f)), mul(c, k / f)));
      points.push(p);
    }
  }
  const idx = (i, j) => (i * (f + 1) - (i * (i - 1)) / 2 + j) | 0;
  const tris = [];
  for (let i = 0; i < f; i++) {
    for (let j = 0; j < f - i; j++) {
      const v0 = idx(i, j);
      const v1 = idx(i + 1, j);
      const v2 = idx(i, j + 1);
      tris.push([v0, v1, v2]);
      if (j < f - i - 1) {
        const v3 = idx(i + 1, j + 1);
        tris.push([v1, v3, v2]);
      }
    }
  }
  return { points, tris };
}

function buildGeodesic(frequency) {
  const { verts, faces } = icosahedron();
  const globalVerts = [];
  const vIndex = new Map();
  const edges = new Set();
  const triangles = [];

  const addVertex = (p) => {
    const key = keyFor(p);
    if (vIndex.has(key)) return vIndex.get(key);
    const idx = globalVerts.length;
    globalVerts.push(p);
    vIndex.set(key, idx);
    return idx;
  };

  const addEdge = (i, j) => {
    if (i === j) return;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    edges.add(`${a}-${b}`);
  };

  for (const [ia, ib, ic] of faces) {
    const { points, tris } = subdivideFace(verts[ia], verts[ib], verts[ic], frequency);
    const mapLocal = points.map(addVertex);
    for (const [p, q, r] of tris) {
      const i = mapLocal[p];
      const j = mapLocal[q];
      const k = mapLocal[r];
      addEdge(i, j);
      addEdge(j, k);
      addEdge(k, i);
      triangles.push([i, j, k]);
    }
  }

  return { vertices: globalVerts, edges, triangles };
}

function filterByCut(vertices, edges, triangles, cut) {
  if (cut === 'full') return { vertices, edges, triangles };
  const keep = new Set();
  vertices.forEach((v, i) => {
    if (v[2] >= -1e-12) keep.add(i);
  });
  const filteredEdges = new Set();
  for (const e of edges) {
    const [a, b] = e.split('-').map(Number);
    if (keep.has(a) && keep.has(b)) filteredEdges.add(e);
  }
  const filteredTris = [];
  for (const [i, j, k] of triangles) {
    if (keep.has(i) && keep.has(j) && keep.has(k)) filteredTris.push([i, j, k]);
  }
  return { vertices, edges: filteredEdges, triangles: filteredTris };
}

function groupByTolerance(values, tol) {
  const groups = [];
  const sorted = [...values].sort((a, b) => a - b);
  for (const v of sorted) {
    const existing = groups.find((g) => Math.abs(g.rep - v) <= tol);
    if (existing) {
      existing.items.push(v);
      existing.count += 1;
      existing.rep = (existing.rep * (existing.count - 1) + v) / existing.count;
    } else {
      groups.push({ rep: v, items: [v], count: 1, label: '' });
    }
  }
  groups.forEach((g, i) => {
    g.label = String.fromCharCode(65 + i);
  });
  return groups;
}

const edgeKey = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);

function faceNormal(a, b, c) {
  return unitVec(cross(sub(b, a), sub(c, a)));
}

function computeDihedrals(vertices, triangles) {
  const edgeFaces = new Map();
  const faceData = triangles.map(([i, j, k]) => {
    const a = vertices[i];
    const b = vertices[j];
    const c = vertices[k];
    return { i, j, k, n: faceNormal(a, b, c) };
  });
  triangles.forEach(([i, j, k], fi) => {
    const edges = [
      [i, j],
      [j, k],
      [k, i],
    ];
    for (const [a, b] of edges) {
      const key = edgeKey(a, b);
      if (!edgeFaces.has(key)) edgeFaces.set(key, []);
      edgeFaces.get(key).push(fi);
    }
  });
  const edgeDihedral = new Map();
  for (const [key, faces] of edgeFaces.entries()) {
    if (faces.length === 2) {
      const fA = faceData[faces[0]];
      const fB = faceData[faces[1]];
      const angle = Math.acos(Math.max(-1, Math.min(1, dot(fA.n, fB.n))));
      edgeDihedral.set(key, angle);
    } else {
      edgeDihedral.set(key, 0);
    }
  }
  return edgeDihedral;
}

const precisionForUnit = (unit) => {
  if (unit === 'mm') return 2;
  if (unit === 'm') return 4;
  return 3;
};

const formatLength = (value, unit) => `${value.toFixed(precisionForUnit(unit))} ${unit}`;
const radiansToDegrees = (radians) => (radians * 180) / Math.PI;

function resizeCanvas(canvas, ctx) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { width: rect.width, height: rect.height };
}

function projectPoint(point, width, height, view) {
  const rotX = (p, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [p[0], p[1] * cos - p[2] * sin, p[1] * sin + p[2] * cos];
  };
  const rotY = (p, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [p[0] * cos + p[2] * sin, p[1], -p[0] * sin + p[2] * cos];
  };
  let rotated = rotX(point, view.rx);
  rotated = rotY(rotated, view.ry);
  const scale = Math.min(width, height) * 0.05 * view.zoom;
  const x = width / 2 + rotated[0] * scale + view.panX;
  const y = height / 2 - rotated[1] * scale + view.panY;
  return { x, y, z: rotated[2] };
}

const defaultView = { rx: -0.3, ry: 0.25, zoom: 0.8, panX: 0, panY: 0 };

const FullscreenTransition = forwardRef(function FullscreenTransition(props, ref) { 
  return <Slide direction="up" ref={ref} {...props} />;
});

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function GeodesicStrutCalc() {
  const [outerDiameter, setOuterDiameter] = useState('24');
  const [unit, setUnit] = useState('ft');
  const [thickness, setThickness] = useState('0.125');
  const [frequency, setFrequency] = useState('4');
  const [tolerance, setTolerance] = useState('0.001');
  const [cut, setCut] = useState('hemisphere');
  const [status, setStatus] = useState({ message: 'Ready', tone: 'ready' });
  const [result, setResult] = useState(null);
  const [visData, setVisData] = useState(null);
  const [showVertices, setShowVertices] = useState(true);
  const [showOuter, setShowOuter] = useState(true);
  const [showInner, setShowInner] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const containerStyles = {
    bgcolor: 'background.default',
    color: 'text.primary',
    borderRadius: 4,
    overflow: 'hidden',
  };

  const surfaceStyles = {
    p: { xs: 2, md: 3 },
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 3,
  };

  const canvasRef = useRef(null);
  const inlineCanvasNodeRef = useRef(null);
  const dialogCanvasNodeRef = useRef(null);
  const ctxRef = useRef(null);
  const viewRef = useRef({ ...defaultView });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const fullscreenOpenRef = useRef(fullscreenOpen);
  fullscreenOpenRef.current = fullscreenOpen;

  const legendGroups = useMemo(() => result?.strutGroups ?? [], [result]);

  const statusColor = useMemo(() => {
    switch (status.tone) {
      case 'error':
        return 'error.light';
      case 'done':
        return 'success.light';
      case 'busy':
        return 'info.light';
      default:
        return 'text.secondary';
    }
  }, [status.tone]);

  const renderVisualizationRef = useRef(() => {});

  const renderVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !visData) return;
    const { width, height } = resizeCanvas(canvas, ctx);
    const projectedOuter = visData.outerVerts.map((vertex) => projectPoint(vertex, width, height, viewRef.current));
    const projectedInner = visData.innerVerts.map((vertex) => projectPoint(vertex, width, height, viewRef.current));

    const drawEdges = (proj, palette) => {
      const items = visData.edges.map((edge) => {
        const [a, b] = edge.split('-').map(Number);
        const p1 = proj[a];
        const p2 = proj[b];
        const z = (p1.z + p2.z) / 2;
        const label = visData.edgeGroup.get(edge);
        const index = legendGroups.findIndex((g) => g.label === label);
        const color = index >= 0 ? palette[index % palette.length] : '#666';
        return { p1, p2, z, color };
      });
      items.sort((a, b) => a.z - b.z);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      items.forEach(({ p1, p2, color }) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    };

    if (showOuter) {
      drawEdges(projectedOuter, warmPalette);
    }
    if (showInner) {
      drawEdges(projectedInner, coolPalette);
    }

    if (showVertices) {
      ctx.fillStyle = 'rgba(238, 242, 255, 0.85)';
      projectedOuter.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [legendGroups, showInner, showOuter, showVertices, visData]);

  useEffect(() => {
    renderVisualizationRef.current = renderVisualization;
    renderVisualization();
  }, [renderVisualization]);

  const attachCanvas = useCallback((node) => {
    if (!node || canvasRef.current === node) return;
    const context = node.getContext('2d');
    canvasRef.current = node;
    ctxRef.current = context;
    if (!context) {
      return;
    }
    requestAnimationFrame(() => {
      renderVisualizationRef.current();
    });
  }, []);

  const detachCanvas = useCallback((node) => {
    if (node && canvasRef.current === node) {
      canvasRef.current = null;
      ctxRef.current = null;
    }
  }, []);

  const handleInlineCanvasRef = useCallback((node) => {
    if (node) {
      inlineCanvasNodeRef.current = node;
      if (!fullscreenOpenRef.current) {
        attachCanvas(node);
      }
    } else {
      const prev = inlineCanvasNodeRef.current;
      inlineCanvasNodeRef.current = null;
      if (!fullscreenOpenRef.current) {
        detachCanvas(prev);
      }
    }
  }, [attachCanvas, detachCanvas]);

  const handleDialogCanvasRef = useCallback((node) => {
    if (node) {
      dialogCanvasNodeRef.current = node;
      if (fullscreenOpenRef.current) {
        attachCanvas(node);
      }
    } else {
      const prev = dialogCanvasNodeRef.current;
      dialogCanvasNodeRef.current = null;
      if (fullscreenOpenRef.current) {
        detachCanvas(prev);
      }
    }
  }, [attachCanvas, detachCanvas]);

  useEffect(() => {
    const activeCanvas = fullscreenOpen
      ? dialogCanvasNodeRef.current
      : inlineCanvasNodeRef.current;
    if (activeCanvas) {
      attachCanvas(activeCanvas);
    }
  }, [attachCanvas, fullscreenOpen]);

  const handleDialogExited = useCallback(() => {
    renderVisualizationRef.current();
  }, []);

  const queueRender = useCallback((beforeRender) => {
    requestAnimationFrame(() => {
      if (beforeRender) {
        beforeRender();
      }
      renderVisualizationRef.current();
    });
  }, []);

  const Controls = () => (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ mt: 2 }}
      alignItems="center"
      flexWrap="wrap"
    >
      <Button
        size="small"
        variant="outlined"
        onClick={() => {
          viewRef.current = { ...defaultView };
          renderVisualizationRef.current();
        }}
      >
        Reset view
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => {
          viewRef.current = { ...viewRef.current, rx: 0, ry: 0 };
          renderVisualizationRef.current();
        }}
      >
        Top view
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => {
          viewRef.current = { ...viewRef.current, rx: -Math.PI / 2, ry: 0 };
          renderVisualizationRef.current();
        }}
      >
        Side view
      </Button>
      <FormControlLabel
        control={(
          <Checkbox
            size="small"
            checked={showOuter}
            onChange={(event) => {
              setShowOuter(event.target.checked);
              queueRender();
            }}
          />
        )}
        label="Show outer struts"
      />
      <FormControlLabel
        control={(
          <Checkbox
            size="small"
            checked={showInner}
            onChange={(event) => {
              setShowInner(event.target.checked);
              queueRender();
            }}
          />
        )}
        label="Show inner struts"
      />
      <FormControlLabel
        sx={{ ml: { sm: 'auto' } }}
        control={(
          <Checkbox
            size="small"
            checked={showVertices}
            onChange={(event) => {
              setShowVertices(event.target.checked);
              queueRender();
            }}
          />
        )}
        label="Show vertices"
      />
    </Stack>
  );

  const handleDialogEntered = useCallback(() => {
    renderVisualizationRef.current();
  }, []);

  const performCompute = useCallback(() => {
    const dia = parseFloat(outerDiameter);
    const freq = Math.max(1, Math.min(10, Math.round(parseFloat(frequency) || 4)));
    const thick = Math.max(0, Math.abs(parseFloat(thickness) || 0));
    const tol = Math.abs(parseFloat(tolerance) || 0.001);

    if (!(dia > 0)) {
      setStatus({ message: 'Enter a positive outer diameter.', tone: 'error' });
      return;
    }

    setStatus({ message: 'Computing…', tone: 'busy' });

    const radiusOuter = dia / 2;
    const radiusMid = Math.max(1e-9, radiusOuter - thick / 2);
    const radiusInner = Math.max(1e-9, radiusOuter - thick);

    const built = buildGeodesic(freq);
    const { vertices, edges, triangles } = filterByCut(built.vertices, built.edges, built.triangles, cut);
    const edgeDihedral = computeDihedrals(vertices, triangles);

    const edgeLengthMid = new Map();
    for (const edge of edges) {
      const [a, b] = edge.split('-').map(Number);
      const chordUnit = norm(sub(vertices[a], vertices[b]));
      edgeLengthMid.set(edge, chordUnit * radiusMid);
    }

    const groups = groupByTolerance(Array.from(edgeLengthMid.values()), tol);
    const edgeGroup = new Map();
    for (const edge of edges) {
      const length = edgeLengthMid.get(edge);
      let best = null;
      let bestDiff = Infinity;
      for (const g of groups) {
        const diff = Math.abs(g.rep - length);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = g;
        }
      }
      edgeGroup.set(edge, best && bestDiff <= tol ? best.label : '?');
    }

    const typeAggregates = new Map();
    for (const edge of edges) {
      const label = edgeGroup.get(edge);
      const midLength = edgeLengthMid.get(edge);
      const dihedral = edgeDihedral.get(edge) || 0;
      const bevelRad = dihedral / 2;
      const outerLength = midLength + thick * Math.tan(bevelRad);
      const innerLength = Math.max(0, midLength - thick * Math.tan(bevelRad));
      if (!typeAggregates.has(label)) {
        typeAggregates.set(label, { mid: 0, outer: 0, inner: 0, bevel: 0, qty: 0 });
      }
      const record = typeAggregates.get(label);
      record.mid += midLength;
      record.outer += outerLength;
      record.inner += innerLength;
      record.bevel += bevelRad;
      record.qty += 1;
    }

    const strutTypes = Array.from(typeAggregates.entries())
      .map(([label, agg]) => {
        const { qty } = agg;
        return {
          label,
          mid: agg.mid / qty,
          outer: agg.outer / qty,
          inner: agg.inner / qty,
          bevelDeg: radiansToDegrees(agg.bevel / qty),
          qty,
        };
      })
      .sort((a, b) => a.mid - b.mid);

    const triangleMap = new Map();
    for (const [i, j, k] of triangles) {
      const labels = [edgeGroup.get(edgeKey(i, j)), edgeGroup.get(edgeKey(j, k)), edgeGroup.get(edgeKey(k, i))]
        .sort()
        .join('-');
      const dihedrals = [
        radiansToDegrees(edgeDihedral.get(edgeKey(i, j)) || 0),
        radiansToDegrees(edgeDihedral.get(edgeKey(j, k)) || 0),
        radiansToDegrees(edgeDihedral.get(edgeKey(k, i)) || 0),
      ].sort((a, b) => a - b);
      if (!triangleMap.has(labels)) triangleMap.set(labels, { count: 0, sums: [0, 0, 0] });
      const entry = triangleMap.get(labels);
      entry.count += 1;
      entry.sums[0] += dihedrals[0];
      entry.sums[1] += dihedrals[1];
      entry.sums[2] += dihedrals[2];
    }

    const panelGroups = Array.from(triangleMap.entries())
      .map(([signature, entry], index) => ({
        label: `T${index + 1}`,
        composition: signature.replaceAll('-', ' + '),
        count: entry.count,
        dihedrals: entry.sums.map((sum) => sum / entry.count),
      }))
      .sort((a, b) => a.dihedrals[0] - b.dihedrals[0]);

    const totalStruts = edges.size;

    setResult({
      strutTypes,
      panelGroups,
      strutGroups: groups,
      summary: {
        frequency: freq,
        radiusOuter,
        radiusMid,
        radiusInner,
        thickness: thick,
        tolerance: tol,
        totalStruts,
      },
      unit,
    });

    setVisData({
      outerVerts: vertices.map((v) => mul(v, radiusOuter)),
      innerVerts: vertices.map((v) => mul(v, radiusInner)),
      edges: Array.from(edges),
      edgeGroup,
      strutGroups: groups,
    });

    setStatus({ message: 'Done', tone: 'done' });
    queueRender(() => {
      viewRef.current = { ...defaultView };
    });
  }, [cut, frequency, outerDiameter, thickness, tolerance, unit, queueRender]);

  useEffect(() => {
    if (!canvasRef.current || !ctxRef.current) return;
    performCompute();
  }, [performCompute]);

  useEffect(() => {
    const handleResize = () => {
      renderVisualizationRef.current();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    lastPointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    isDraggingRef.current = true;
  }, []);

  useEffect(() => {
    const handleUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (!isDraggingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = x - lastPointerRef.current.x;
    const dy = y - lastPointerRef.current.y;
    viewRef.current = {
      ...viewRef.current,
      ry: viewRef.current.ry + dx * 0.01,
      rx: viewRef.current.rx + dy * 0.01,
    };
    lastPointerRef.current = { x, y };
    renderVisualizationRef.current();
  }, []);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    viewRef.current = {
      ...viewRef.current,
      zoom: Math.max(0.02, Math.min(12, viewRef.current.zoom * factor)),
    };
    renderVisualizationRef.current();
  }, []);

  const handleTouchStart = useCallback((event) => {
    if (event.touches.length !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = event.touches[0];
    lastPointerRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    isDraggingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((event) => {
    if (!isDraggingRef.current || event.touches.length !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const dx = x - lastPointerRef.current.x;
    const dy = y - lastPointerRef.current.y;
    viewRef.current = {
      ...viewRef.current,
      ry: viewRef.current.ry + dx * 0.01,
      rx: viewRef.current.rx + dy * 0.01,
    };
    lastPointerRef.current = { x, y };
    renderVisualizationRef.current();
  }, []);

  const summaryText = useMemo(() => {
    if (!result) return 'Enter inputs and run the calculator.';
    const { summary } = result;
    return `Frequency ${summary.frequency}V • Outer radius ${formatLength(summary.radiusOuter, unit)} • Mid radius ${formatLength(summary.radiusMid, unit)} • Inner radius ${formatLength(summary.radiusInner, unit)} • Thickness ${formatLength(summary.thickness, unit)} • ${result.strutTypes.length} strut types`;
  }, [result, unit]);

  const legend = useMemo(() => {
    if (!legendGroups.length) return null;
    return (
      <Stack direction="row" flexWrap="wrap" spacing={1.5} mt={2} alignItems="center">
        {legendGroups.map((group, index) => (
          <Stack key={group.label} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 16, height: 4, borderRadius: 1, backgroundColor: warmPalette[index % warmPalette.length] }} />
            <Box sx={{ width: 16, height: 4, borderRadius: 1, backgroundColor: coolPalette[index % coolPalette.length] }} />
            <Typography variant="caption" color="text.secondary">
              {group.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  }, [legendGroups]);

  const handleDownloadStruts = useCallback(() => {
    if (!result) return;
    const rows = [
      ['Type', `Centerline (${unit})`, `Outer (${unit})`, `Inner (${unit})`, 'Bevel (deg)', 'Quantity'],
      ...result.strutTypes.map((s) => [
        s.label,
        s.mid.toFixed(precisionForUnit(unit)),
        s.outer.toFixed(precisionForUnit(unit)),
        s.inner.toFixed(precisionForUnit(unit)),
        s.bevelDeg.toFixed(2),
        String(s.qty),
      ]),
    ];
    downloadCsv(`geodesic_struts_outer_inner_${outerDiameter}${unit}.csv`, rows);
  }, [outerDiameter, result, unit]);

  const handleDownloadPanels = useCallback(() => {
    if (!result) return;
    const rows = [
      ['Panel', 'Panels', 'Edges', 'Dihedral 1 (deg)', 'Dihedral 2 (deg)', 'Dihedral 3 (deg)'],
      ...result.panelGroups.map((panel) => [
        panel.label,
        String(panel.count),
        panel.composition,
        ...panel.dihedrals.map((d) => d.toFixed(2)),
      ]),
    ];
    downloadCsv(`geodesic_panel_dihedrals_${outerDiameter}${unit}.csv`, rows);
  }, [outerDiameter, result, unit]);

  return (
    <Box sx={containerStyles}>
      <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Paper elevation={0} sx={surfaceStyles}>
          <Stack spacing={2}>
            <Stack spacing={1}>
              <Typography variant="h4">Geodesic Strut Calculator</Typography>
              <Typography variant="body2" color="text.secondary">
                Size outer and inner struts for wood panels that butt along beveled edges. Enter an outer diameter, panel thickness, and frequency to see matching strut lengths and bevels.
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Outer diameter"
                  value={outerDiameter}
                  type="number"
                  inputProps={{ step: 0.001, min: 0 }}
                  onChange={(event) => setOuterDiameter(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="strut-unit-label">Units</InputLabel>
                  <Select
                    labelId="strut-unit-label"
                    label="Units"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                  >
                    <MenuItem value="ft">feet</MenuItem>
                    <MenuItem value="in">inches</MenuItem>
                    <MenuItem value="m">meters</MenuItem>
                    <MenuItem value="mm">millimeters</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Wall thickness"
                  type="number"
                  value={thickness}
                  inputProps={{ step: 0.001, min: 0 }}
                  onChange={(event) => setThickness(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frequency"
                  type="number"
                  value={frequency}
                  inputProps={{ min: 1, max: 10, step: 1 }}
                  onChange={(event) => setFrequency(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="strut-cut-label">Dome cut</InputLabel>
                  <Select
                    labelId="strut-cut-label"
                    label="Dome cut"
                    value={cut}
                    onChange={(event) => setCut(event.target.value)}
                  >
                    <MenuItem value="hemisphere">Hemisphere (z ≥ 0)</MenuItem>
                    <MenuItem value="full">Full sphere</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={`Grouping tolerance (${unit})`}
                  type="number"
                  value={tolerance}
                  inputProps={{ step: 0.0001, min: 0 }}
                  onChange={(event) => setTolerance(event.target.value)}
                />
              </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Button variant="outlined" onClick={handleDownloadStruts} disabled={!result}>
                Download struts CSV
              </Button>
              <Button variant="outlined" onClick={handleDownloadPanels} disabled={!result}>
                Download panels CSV
              </Button>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  px: 1,
                  py: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  color: statusColor,
                  ml: { sm: 'auto' },
                }}
              >
                <Typography variant="caption" fontWeight={600}>
                  {status.message}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                ...surfaceStyles,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Strut types (outer / inner)
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {summaryText}
              </Typography>
              {result && result.strutTypes.length > 0 ? (
                <Table size="small" sx={{ mt: 1.5 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Centerline</TableCell>
                      <TableCell>Outer</TableCell>
                      <TableCell>Inner</TableCell>
                      <TableCell>Bevel</TableCell>
                      <TableCell>Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.strutTypes.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>
                          <Typography component="span" fontWeight={700}>
                            {row.label}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <code>{row.mid.toFixed(precisionForUnit(unit))}</code>
                        </TableCell>
                        <TableCell>
                          <code>{row.outer.toFixed(precisionForUnit(unit))}</code>
                        </TableCell>
                        <TableCell>
                          <code>{row.inner.toFixed(precisionForUnit(unit))}</code>
                        </TableCell>
                        <TableCell>{row.bevelDeg.toFixed(2)}°</TableCell>
                        <TableCell>{row.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" mt={2}>
                  Enter inputs and compute to populate strut lengths.
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                ...surfaceStyles,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Triangle panels
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {result ? `${result.panelGroups.length} panel classes by edge composition.` : 'Panel grouping appears after computing.'}
              </Typography>
              {result && result.panelGroups.length > 0 ? (
                <Table size="small" sx={{ mt: 1.5 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Panel</TableCell>
                      <TableCell>Edges</TableCell>
                      <TableCell>Panels</TableCell>
                      <TableCell>Dihedrals</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.panelGroups.map((panel) => (
                      <TableRow key={panel.label}>
                        <TableCell>
                          <Typography component="span" fontWeight={700}>
                            {panel.label}
                          </Typography>
                        </TableCell>
                        <TableCell>{panel.composition}</TableCell>
                        <TableCell>{panel.count}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {panel.dihedrals.map((d, idx) => (
                              <code key={idx}>{d.toFixed(2)}°</code>
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" mt={2}>
                  Panel composition and dihedrals will appear after running the calculator.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={0} sx={surfaceStyles}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="h6" fontWeight={600}>
              3D visualization • outer & inner struts
            </Typography>
            <Tooltip title="Open full screen">
              <IconButton
                color="inherit"
                onClick={() => setFullscreenOpen(true)}
                aria-label="Open full screen visualization"
              >
                <OpenInFullIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {!fullscreenOpen ? (
            <>
              <Box
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  height: 420,
                }}
              >
                <Box
                  component="canvas"
                  ref={handleInlineCanvasRef}
                  sx={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                />
              </Box>

              <Controls />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" mt={2}>
              Visualization is open in full screen.
            </Typography>
          )}
          {legend}
          <Typography variant="body2" color="text.secondary" mt={2}>
            Drag to rotate, scroll to zoom. Warm colors show outer struts, cool colors show inner struts for each type; use the toggles above to focus on a layer.
          </Typography>
        </Paper>

        <Dialog
          fullScreen
          open={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          TransitionComponent={FullscreenTransition}
          TransitionProps={{ onEntered: handleDialogEntered, onExited: handleDialogExited }}
          PaperProps={{ sx: { bgcolor: 'background.default', display: 'flex' } }}
        >
          <AppBar position="relative" color="primary" enableColorOnDark>
            <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                3D visualization • outer & inner struts
              </Typography>
              <IconButton
                edge="end"
                color="inherit"
                aria-label="Close full screen visualization"
                onClick={() => setFullscreenOpen(false)}
              >
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Toolbar />
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                p: { xs: 2, md: 4 },
                gap: 2,
                minHeight: 0,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  minHeight: 0,
                }}
              >
                <Box
                  component="canvas"
                  ref={handleDialogCanvasRef}
                  sx={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'none' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                />
              </Box>

              <Controls />
            </Box>
          </Box>
        </Dialog>
      </Stack>
    </Box>
  );
}
