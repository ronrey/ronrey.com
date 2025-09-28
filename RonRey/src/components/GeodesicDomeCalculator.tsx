import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type Ref,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Toolbar,
  Tooltip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import AppBar from "@mui/material/AppBar";
import Slide from "@mui/material/Slide";
import { type TransitionProps } from "@mui/material/transitions";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseIcon from "@mui/icons-material/Close";

const strutColors = [
  "#ff4757",
  "#3742fa",
  "#2ed573",
  "#ffa502",
  "#ff6b9d",
  "#5f27cd",
  "#00d2d3",
  "#ff9f43",
  "#1e90ff",
  "#32cd32",
  "#ff1493",
  "#ffd700",
];

type Vec3 = [number, number, number];
type Unit = "ft" | "in" | "m" | "mm";
type Cut = "hemisphere" | "full";

type Group = {
  label: string;
  rep: number;
  items: number[];
  count: number;
};

type StrutGroup = Group & {
  mean: number;
  color: string;
};

type PanelGroup = {
  label: string;
  count: number;
  avgs: Vec3;
  composition: string;
};

type ComputeResult = {
  strutGroups: StrutGroup[];
  panelGroups: PanelGroup[];
  totalStruts: number;
  frequency: number;
  radius: number;
  tolerance: number;
  unit: Unit;
  cut: Cut;
};

type VisualizationData = {
  vertices: Vec3[];
  edges: string[];
  edgeStrutMap: Map<string, string>;
};

type ViewState = {
  rotationX: number;
  rotationY: number;
  zoom: number;
  panX: number;
  panY: number;
};

const defaultViewState: ViewState = {
  rotationX: -0.3,
  rotationY: 0.2,
  zoom: 0.8,
  panX: 0,
  panY: 0,
};

const FullscreenTransition = forwardRef(function FullscreenTransition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function norm([x, y, z]: Vec3) {
  return Math.hypot(x, y, z);
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function mul(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function unitVec(v: Vec3): Vec3 {
  const n = norm(v);
  return n ? [v[0] / n, v[1] / n, v[2] / n] : [0, 0, 0];
}

function rotateX([x, y, z]: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function rotateY([x, y, z]: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function icosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  const baseVerts: Vec3[] = [
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
  ];
  const verts = baseVerts.map((coords) => unitVec(coords));
  const faces: [number, number, number][] = [
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

function keyFor(v: Vec3, q = 1e6) {
  return `${Math.round(v[0] * q)}_${Math.round(v[1] * q)}_${Math.round(
    v[2] * q
  )}`;
}

function subdivideFace(a: Vec3, b: Vec3, c: Vec3, f: number) {
  const points: Vec3[] = [];
  for (let i = 0; i <= f; i++) {
    for (let j = 0; j <= f - i; j++) {
      const k = f - i - j;
      const p = unitVec(add(add(mul(a, i / f), mul(b, j / f)), mul(c, k / f)));
      points.push(p);
    }
  }
  const idx = (i: number, j: number) =>
    (i * (f + 1) - (i * (i - 1)) / 2 + j) | 0;
  const tris: [number, number, number][] = [];
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

function buildGeodesic(frequency: number) {
  const { verts, faces } = icosahedron();
  const globalVerts: Vec3[] = [];
  const vIndex = new Map<string, number>();
  const edges = new Set<string>();
  const triangles: [number, number, number][] = [];

  const addVertex = (p: Vec3) => {
    const key = keyFor(p);
    if (vIndex.has(key)) return vIndex.get(key)!;
    const idx = globalVerts.length;
    globalVerts.push(p);
    vIndex.set(key, idx);
    return idx;
  };

  const addEdge = (i: number, j: number) => {
    if (i === j) return;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    edges.add(`${a}-${b}`);
  };

  for (const [ia, ib, ic] of faces) {
    const { points, tris } = subdivideFace(
      verts[ia],
      verts[ib],
      verts[ic],
      frequency
    );
    const mapLocalToGlobal = points.map(addVertex);
    for (const [p, q, r] of tris) {
      const i = mapLocalToGlobal[p];
      const j = mapLocalToGlobal[q];
      const k = mapLocalToGlobal[r];
      addEdge(i, j);
      addEdge(j, k);
      addEdge(k, i);
      triangles.push([i, j, k]);
    }
  }

  return { vertices: globalVerts, edges, triangles };
}

function filterByCut(
  vertices: Vec3[],
  edges: Set<string>,
  triangles: [number, number, number][],
  cut: Cut
) {
  if (cut === "full") return { vertices, edges, triangles };

  const keep = new Set<number>();
  vertices.forEach((v, idx) => {
    if (v[2] >= -1e-12) keep.add(idx);
  });

  const filteredEdges = new Set<string>();
  for (const e of edges) {
    const [a, b] = e.split("-").map(Number);
    if (keep.has(a) && keep.has(b)) filteredEdges.add(e);
  }

  const filteredTriangles: [number, number, number][] = [];
  for (const [i, j, k] of triangles) {
    if (keep.has(i) && keep.has(j) && keep.has(k))
      filteredTriangles.push([i, j, k]);
  }

  return { vertices, edges: filteredEdges, triangles: filteredTriangles };
}

function groupByTolerance(lengths: number[], tol: number): Group[] {
  const groups: Group[] = [];
  const sorted = [...lengths].sort((a, b) => a - b);
  for (const value of sorted) {
    const existing = groups.find((g) => Math.abs(g.rep - value) <= tol);
    if (existing) {
      existing.items.push(value);
      existing.count += 1;
      existing.rep =
        (existing.rep * (existing.count - 1) + value) / existing.count;
    } else {
      groups.push({ rep: value, items: [value], count: 1, label: "" });
    }
  }
  groups.forEach((g, idx) => {
    g.label = String.fromCharCode(65 + idx);
  });
  return groups;
}

function precisionForUnit(unit: Unit) {
  if (unit === "mm") return 2;
  if (unit === "m") return 4;
  return 3;
}

function formatLength(value: number, unit: Unit) {
  return `${value.toFixed(precisionForUnit(unit))} ${unit}`;
}

function panelKeyFromTriplet(values: Vec3, tol: number) {
  const safeTol = Math.max(tol, 1e-9);
  const bins = [...values]
    .sort((a, b) => a - b)
    .map((length) => Math.round(length / safeTol));
  return bins.join("-");
}

function findGroupLabel(length: number, groups: StrutGroup[]) {
  let best: string | null = null;
  let bestDiff = Infinity;
  for (const g of groups) {
    const diff = Math.abs(g.mean - length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = g.label;
    }
  }
  return best;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function projectPoint(
  point: Vec3,
  width: number,
  height: number,
  view: ViewState
) {
  let rotated = rotateX(point, view.rotationX);
  rotated = rotateY(rotated, view.rotationY);
  const scale = Math.min(width, height) * 0.05 * view.zoom;
  const x = width / 2 + rotated[0] * scale + view.panX;
  const y = height / 2 - rotated[1] * scale + view.panY;
  return { x, y, z: rotated[2] };
}

export default function GeodesicDomeCalculator() {
  const [diameter, setDiameter] = useState("24");
  const [unit, setUnit] = useState<Unit>("ft");
  const [tolerance, setTolerance] = useState("0.001");
  const [frequency, setFrequency] = useState("4");
  const [cut, setCut] = useState<Cut>("hemisphere");
  const [status, setStatus] = useState<{
    message: string;
    tone: "ready" | "busy" | "done" | "error";
  }>({
    message: "Ready",
    tone: "ready",
  });
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [visData, setVisData] = useState<VisualizationData | null>(null);
  const [showVertices, setShowVertices] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const containerStyles = {
    bgcolor: "background.default",
    color: "text.primary",
    borderRadius: 4,
    overflow: "hidden",
  } as const;

  const surfaceStyles = {
    p: { xs: 2, md: 3 },
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 3,
  } as const;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inlineCanvasNodeRef = useRef<HTMLCanvasElement | null>(null);
  const dialogCanvasNodeRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const viewStateRef = useRef<ViewState>({ ...defaultViewState });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const fullscreenOpenRef = useRef(fullscreenOpen);
  fullscreenOpenRef.current = fullscreenOpen;

  const toleranceSuffix = useMemo(() => `(${unit})`, [unit]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, []);

  const renderVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !visData) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const projected = visData.vertices.map((vertex) =>
      projectPoint(vertex, width, height, viewStateRef.current)
    );

    const strutGroups = result?.strutGroups ?? [];
    const edges = visData.edges
      .map((edge) => {
        const [a, b] = edge.split("-").map(Number);
        const p1 = projected[a];
        const p2 = projected[b];
        const avgZ = (p1.z + p2.z) / 2;
        return { edge, p1, p2, avgZ };
      })
      .sort((a, b) => a.avgZ - b.avgZ);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    for (const item of edges) {
      const groupLabel = visData.edgeStrutMap.get(item.edge);
      const colorIndex = strutGroups.findIndex((g) => g.label === groupLabel);
      const strokeStyle =
        colorIndex >= 0 ? strutGroups[colorIndex].color : "#666666";
      ctx.strokeStyle = strokeStyle;
      ctx.beginPath();
      ctx.moveTo(item.p1.x, item.p1.y);
      ctx.lineTo(item.p2.x, item.p2.y);
      ctx.stroke();
    }

    if (showVertices) {
      ctx.fillStyle = "rgba(238, 242, 255, 0.8)";
      projected.forEach((p) => {
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [result, showVertices, visData]);

  useEffect(() => {
    const handleResize = () => {
      resizeCanvas();
      renderVisualization();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [renderVisualization, resizeCanvas]);

  useEffect(() => {
    renderVisualization();
  }, [renderVisualization]);

  const attachCanvas = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (!node) {
        return;
      }
      if (canvasRef.current === node) {
        return;
      }
      const context = node.getContext("2d");
      canvasRef.current = node;
      ctxRef.current = context ?? null;
      if (!context) {
        return;
      }
      requestAnimationFrame(() => {
        resizeCanvas();
        renderVisualization();
      });
    },
    [renderVisualization, resizeCanvas]
  );

  const detachCanvas = useCallback((node: HTMLCanvasElement | null) => {
    if (node && canvasRef.current === node) {
      canvasRef.current = null;
      ctxRef.current = null;
    }
  }, []);

  const handleInlineCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
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
    },
    [attachCanvas, detachCanvas]
  );

  const handleDialogCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
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
    },
    [attachCanvas, detachCanvas]
  );

  useEffect(() => {
    const activeCanvas = fullscreenOpen
      ? dialogCanvasNodeRef.current
      : inlineCanvasNodeRef.current;
    if (activeCanvas) {
      attachCanvas(activeCanvas);
    }
  }, [attachCanvas, fullscreenOpen]);

  useEffect(() => {
    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    return () => {
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, []);

  const performCompute = useCallback(() => {
    const dia = parseFloat(diameter);
    const freq = Math.max(
      1,
      Math.min(10, Math.round(parseFloat(frequency) || 4))
    );
    const tolRaw = parseFloat(tolerance);
    const tol = Number.isFinite(tolRaw)
      ? Math.max(Math.abs(tolRaw), 1e-6)
      : 0.001;

    if (!Number.isFinite(dia) || dia <= 0) {
      setStatus({ message: "Enter a positive diameter.", tone: "error" });
      return;
    }

    setStatus({ message: "Computing...", tone: "busy" });

    const radius = dia / 2;
    const built = buildGeodesic(freq);
    const filtered = filterByCut(
      built.vertices,
      built.edges,
      built.triangles,
      cut
    );

    const edgeLengths: number[] = [];
    const edgeToLength = new Map<string, number>();

    for (const edge of filtered.edges) {
      const [a, b] = edge.split("-").map(Number);
      const diff = sub(filtered.vertices[a], filtered.vertices[b]);
      const length = norm(diff) * radius;
      edgeLengths.push(length);
      edgeToLength.set(edge, length);
    }

    const grouped = groupByTolerance(edgeLengths, tol);
    const strutGroups: StrutGroup[] = grouped.map((group, index) => {
      const mean =
        group.items.reduce((sum, value) => sum + value, 0) / group.items.length;
      return {
        ...group,
        mean,
        color: strutColors[index % strutColors.length],
      };
    });

    const edgeStrutMap = new Map<string, string>();
    for (const edge of filtered.edges) {
      const length = edgeToLength.get(edge);
      if (length == null) continue;
      const label = findGroupLabel(length, strutGroups);
      if (label) edgeStrutMap.set(edge, label);
    }

    const panelMap = new Map<string, { count: number; sums: Vec3 }>();
    for (const [i, j, k] of filtered.triangles) {
      const a = norm(sub(filtered.vertices[i], filtered.vertices[j])) * radius;
      const b = norm(sub(filtered.vertices[j], filtered.vertices[k])) * radius;
      const c = norm(sub(filtered.vertices[k], filtered.vertices[i])) * radius;
      const sortedTriplet = [a, b, c].sort((m, n) => m - n) as Vec3;
      const key = panelKeyFromTriplet(sortedTriplet, tol);
      const current = panelMap.get(key);
      if (current) {
        current.count += 1;
        current.sums[0] += sortedTriplet[0];
        current.sums[1] += sortedTriplet[1];
        current.sums[2] += sortedTriplet[2];
      } else {
        panelMap.set(key, {
          count: 1,
          sums: [sortedTriplet[0], sortedTriplet[1], sortedTriplet[2]],
        });
      }
    }

    const panels: PanelGroup[] = Array.from(panelMap.values())
      .map((entry, idx) => {
        const avgs: Vec3 = [
          entry.sums[0] / entry.count,
          entry.sums[1] / entry.count,
          entry.sums[2] / entry.count,
        ];
        const labels = [...avgs]
          .sort((a, b) => a - b)
          .map((val) => findGroupLabel(val, strutGroups) || "?")
          .sort();
        const parts: string[] = [];
        let run = 1;
        for (let i = 1; i <= labels.length; i++) {
          if (i < labels.length && labels[i] === labels[i - 1]) {
            run += 1;
          } else {
            parts.push(`${run}x${labels[i - 1]}`);
            run = 1;
          }
        }
        return {
          label: `T${idx + 1}`,
          count: entry.count,
          avgs,
          composition: parts.join(" + "),
        };
      })
      .sort((a, b) => a.avgs[0] - b.avgs[0])
      .map((panel, idx) => ({ ...panel, label: `T${idx + 1}` }));

    const scaledVertices = filtered.vertices.map((vertex) =>
      mul(vertex, radius)
    );

    setResult({
      strutGroups,
      panelGroups: panels,
      totalStruts: edgeLengths.length,
      frequency: freq,
      radius,
      tolerance: tol,
      unit,
      cut,
    });

    setVisData({
      vertices: scaledVertices,
      edges: Array.from(filtered.edges),
      edgeStrutMap,
    });

    viewStateRef.current = { ...defaultViewState };
    setStatus({ message: "Done", tone: "done" });
  }, [cut, diameter, frequency, tolerance, unit]);

  useEffect(() => {
    performCompute();
  }, [performCompute]);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      lastPointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      isDraggingRef.current = true;
      setIsDragging(true);
    },
    []
  );

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = x - lastPointerRef.current.x;
      const dy = y - lastPointerRef.current.y;
      viewStateRef.current.rotationY += dx * 0.01;
      viewStateRef.current.rotationX += dy * 0.01;
      lastPointerRef.current = { x, y };
      renderVisualization();
    },
    [renderVisualization]
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      viewStateRef.current.zoom = Math.max(
        0.02,
        Math.min(12, viewStateRef.current.zoom * factor)
      );
      renderVisualization();
    },
    [renderVisualization]
  );

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      if (event.touches.length !== 1) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const touch = event.touches[0];
      lastPointerRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      isDraggingRef.current = true;
      setIsDragging(true);
    },
    []
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      if (!isDraggingRef.current || event.touches.length !== 1) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const touch = event.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const dx = x - lastPointerRef.current.x;
      const dy = y - lastPointerRef.current.y;
      viewStateRef.current.rotationY += dx * 0.01;
      viewStateRef.current.rotationX += dy * 0.01;
      lastPointerRef.current = { x, y };
      renderVisualization();
    },
    [renderVisualization]
  );

  const statusColor = useMemo(() => {
    switch (status.tone) {
      case "error":
        return "error.light";
      case "done":
        return "success.light";
      case "busy":
        return "info.light";
      default:
        return "text.secondary";
    }
  }, [status.tone]);

  const handleDownloadStruts = useCallback(() => {
    if (!result) return;
    const header = ["Strut Type", `Length (${result.unit})`, "Quantity"];
    const rows = result.strutGroups.map((group) => [
      group.label,
      group.mean.toFixed(precisionForUnit(result.unit)),
      group.count,
    ]);
    downloadCsv(
      `geodesic_${result.frequency}V_struts_${diameter}${result.unit}.csv`,
      [header, ...rows]
    );
  }, [diameter, result]);

  const handleDownloadPanels = useCallback(() => {
    if (!result) return;
    const header = [
      "Panel",
      "Panels",
      "Composition",
      `Edge1 (${result.unit})`,
      `Edge2 (${result.unit})`,
      `Edge3 (${result.unit})`,
    ];
    const rows = result.panelGroups.map((panel) => [
      panel.label,
      String(panel.count),
      panel.composition,
      ...panel.avgs.map((value) =>
        value.toFixed(precisionForUnit(result.unit))
      ),
    ]);
    downloadCsv(
      `geodesic_${result.frequency}V_panels_${diameter}${result.unit}.csv`,
      [header, ...rows]
    );
  }, [diameter, result]);

  const handleResetView = useCallback(() => {
    viewStateRef.current = { ...defaultViewState };
    renderVisualization();
  }, [renderVisualization]);

  const handleTopView = useCallback(() => {
    viewStateRef.current.rotationX = -Math.PI / 2;
    viewStateRef.current.rotationY = 0;
    renderVisualization();
  }, [renderVisualization]);

  const handleSideView = useCallback(() => {
    viewStateRef.current.rotationX = 0;
    viewStateRef.current.rotationY = 0;
    renderVisualization();
  }, [renderVisualization]);

  const Controls = () => (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ mt: 2 }}
      alignItems="center"
      flexWrap="wrap"
    >
      <Button size="small" variant="outlined" onClick={handleResetView}>
        Reset view
      </Button>
      <Button size="small" variant="outlined" onClick={handleTopView}>
        Top view
      </Button>
      <Button size="small" variant="outlined" onClick={handleSideView}>
        Side view
      </Button>

      <FormControlLabel
        sx={{ ml: { sm: "auto" } }}
        control={
          <Checkbox
            checked={showVertices}
            onChange={(event) => {
              setShowVertices(event.target.checked);
              renderVisualization();
            }}
            color="primary"
          />
        }
        label="Show vertices"
      />
    </Stack>
  );

  const handleDialogEntered = useCallback(() => {
    resizeCanvas();
    renderVisualization();
  }, [renderVisualization, resizeCanvas]);

  const handleDialogExited = useCallback(() => {
    resizeCanvas();
    renderVisualization();
  }, [renderVisualization, resizeCanvas]);

  const summaryText = useMemo(() => {
    if (!result) return "Enter inputs to see dome strut summary.";
    const toleranceText = `${result.tolerance.toFixed(
      precisionForUnit(result.unit)
    )} ${result.unit}`;
    return (
      `Frequency ${result.frequency}V • Radius ${formatLength(
        result.radius,
        result.unit
      )} • Cut: ${result.cut}. ` +
      `${result.strutGroups.length} unique strut length${
        result.strutGroups.length === 1 ? "" : "s"
      } (tolerance ${toleranceText}); total struts: ${result.totalStruts}.`
    );
  }, [result]);

  const panelSummary = useMemo(() => {
    if (!result) return "Enter inputs to produce panel groupings.";
    const expected =
      result.frequency === 3
        ? "approx 2"
        : result.frequency === 4
        ? "approx 5"
        : "—";
    return `${result.panelGroups.length} unique triangle panel type${
      result.panelGroups.length === 1 ? "" : "s"
    } detected (expected ${expected} for Class I).`;
  }, [result]);

  return (
    <Box sx={containerStyles}>
      <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Paper elevation={0} sx={surfaceStyles}>
          <Stack spacing={2}>
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                4V Geodesic Dome — Strut Lengths from Diameter
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Enter your dome diameter and retrieve unique strut lengths and
                triangle panels for an icosa-based, Class I dome cut at the
                equator. Lengths are straight chords between nodes.
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dome diameter"
                  value={diameter}
                  onChange={(event) => setDiameter(event.target.value)}
                  type="number"
                  inputProps={{ step: 0.001, min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="unit-label">Units</InputLabel>
                  <Select
                    labelId="unit-label"
                    label="Units"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value as Unit)}
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
                  label={`Grouping tolerance ${toleranceSuffix}`}
                  value={tolerance}
                  onChange={(event) => setTolerance(event.target.value)}
                  type="number"
                  inputProps={{ step: 0.0001, min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frequency"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                  type="number"
                  inputProps={{ min: 1, max: 10, step: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="cut-label">Dome cut</InputLabel>
                  <Select
                    labelId="cut-label"
                    label="Dome cut"
                    value={cut}
                    onChange={(event) => setCut(event.target.value as Cut)}
                  >
                    <MenuItem value="hemisphere">
                      {"Hemisphere (z >= 0)"}
                    </MenuItem>
                    <MenuItem value="full">Full sphere (all struts)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ sm: "center" }}
            >
              <Button
                variant="outlined"
                onClick={handleDownloadStruts}
                disabled={!result}
              >
                Download struts CSV
              </Button>
              <Button
                variant="outlined"
                onClick={handleDownloadPanels}
                disabled={!result}
              >
                Download panels CSV
              </Button>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 999,
                  px: 1,
                  py: 0.5,
                  border: "1px solid",
                  borderColor: "divider",
                  color: statusColor,
                  ml: { sm: "auto" },
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
          <Grid item xs={12} md={6} sx={{ display: "flex" }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                ...surfaceStyles,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Dome strut groups
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mt: 1 }}
              >
                {summaryText}
              </Typography>
              {result && result.strutGroups.length > 0 ? (
                <Table size="small" sx={{ mt: 1.5 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Strut</TableCell>
                      <TableCell>Length ({result.unit})</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Chord ratio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.strutGroups.map((group) => (
                      <TableRow key={group.label}>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography component="span" fontWeight={700}>
                              {group.label}
                            </Typography>
                            <Box
                              sx={{
                                width: 16,
                                height: 3,
                                borderRadius: 1,
                                backgroundColor: group.color,
                              }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <code>
                            {group.mean.toFixed(precisionForUnit(result.unit))}
                          </code>
                        </TableCell>
                        <TableCell>{group.count}</TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>
                          approx{" "}
                          {(group.mean / (result.radius || 1)).toFixed(6)} x R
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mt: 2 }}
                >
                  Adjust inputs to generate strut lengths.
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: "flex" }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                ...surfaceStyles,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Unique triangle panels
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mt: 1 }}
              >
                {panelSummary}
              </Typography>
              {result && result.panelGroups.length > 0 ? (
                <Table size="small" sx={{ mt: 1.5 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Panel</TableCell>
                      <TableCell>Composition</TableCell>
                      <TableCell>Panels</TableCell>
                      <TableCell>Edge lengths ({result.unit})</TableCell>
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
                            {panel.avgs.map((value, idx) => (
                              <code key={idx}>
                                {value.toFixed(precisionForUnit(result.unit))}
                              </code>
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mt: 2 }}
                >
                  Panel composition appears once inputs are valid.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ ...surfaceStyles }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              3D visualization
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
                  overflow: "hidden",
                  bgcolor: "background.paper",
                  height: 420,
                }}
              >
                <Box
                  component="canvas"
                  ref={handleInlineCanvasRef}
                  sx={{
                    width: "100%",
                    height: "100%",
                    cursor: isDragging ? "grabbing" : "grab",
                    touchAction: "none",
                  }}
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
            <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
              Visualization is open in full screen.
            </Typography>
          )}

          {result && result.strutGroups.length > 0 ? (
            <Stack
              direction="row"
              flexWrap="wrap"
              spacing={1.5}
              sx={{ mt: 2 }}
              alignItems="center"
            >
              {result.strutGroups.map((group) => (
                <Stack
                  key={group.label}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Box
                    sx={{
                      width: 16,
                      height: 3,
                      borderRadius: 1,
                      backgroundColor: group.color,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    {group.label} ({group.count})
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : null}

          <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
            Drag to rotate, scroll to zoom. Each color represents a distinct
            strut group.
          </Typography>
        </Paper>

        <Dialog
          fullScreen
          open={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          TransitionComponent={FullscreenTransition}
          TransitionProps={{
            onEntered: handleDialogEntered,
            onExited: handleDialogExited,
          }}
          PaperProps={{
            sx: { bgcolor: "background.default", display: "flex" },
          }}
        >
          <AppBar position="relative" color="primary" enableColorOnDark>
            <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                3D visualization
              </Typography>
              <IconButton
                edge="end"
                color="inherit"
                onClick={() => setFullscreenOpen(false)}
                aria-label="Close full screen visualization"
              >
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <Toolbar />
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                p: { xs: 2, md: 4 },
                gap: 2,
                minHeight: 0,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "background.paper",
                  minHeight: 0,
                }}
              >
                <Box
                  component="canvas"
                  ref={handleDialogCanvasRef}
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    cursor: isDragging ? "grabbing" : "grab",
                    touchAction: "none",
                  }}
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
