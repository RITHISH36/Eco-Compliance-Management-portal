import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Header from "./Header";
import { getReports } from "../utils/reportStore";
import { reports as fallbackReports } from "../data/reports";
import campusBlocks from "../data/campusBlocks.json";
import {
  BAIET_CAMPUS_BOUNDS,
  BAIET_CAMPUS_CENTER,
  getCampusPoint,
  isPointInsideCampus,
} from "../utils/campusMap";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const SATELLITE_STYLE = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Imagery &copy; Esri",
    },
    labels: {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Labels &copy; Esri",
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    { id: "satellite-labels", type: "raster", source: "labels" },
  ],
};

const CAMPUS_BOUNDS = [
  [BAIET_CAMPUS_BOUNDS.west, BAIET_CAMPUS_BOUNDS.south],
  [BAIET_CAMPUS_BOUNDS.east, BAIET_CAMPUS_BOUNDS.north],
];

const fitCampusView = (map) => {
  const compactView = map.getContainer().clientWidth <= 640;
  map.fitBounds(CAMPUS_BOUNDS, {
    padding: compactView
      ? { top: 154, right: 26, bottom: 112, left: 26 }
      : { top: 126, right: 74, bottom: 92, left: 74 },
    maxZoom: 16.8,
    duration: 0,
  });
};

const CAMPUS_BOUNDARY = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        [BAIET_CAMPUS_BOUNDS.west, BAIET_CAMPUS_BOUNDS.south],
        [BAIET_CAMPUS_BOUNDS.east, BAIET_CAMPUS_BOUNDS.south],
        [BAIET_CAMPUS_BOUNDS.east, BAIET_CAMPUS_BOUNDS.north],
        [BAIET_CAMPUS_BOUNDS.west, BAIET_CAMPUS_BOUNDS.north],
        [BAIET_CAMPUS_BOUNDS.west, BAIET_CAMPUS_BOUNDS.south],
      ]],
    },
  }],
};

const pickBlock = (report) => report.block || report.location?.split("-")[0]?.trim() || "IB";
const statusClass = (status = "") => status.toLowerCase().replace(/\s+/g, "-");
const isResolved = (status) => status === "Resolved";
const getProgress = (report) => {
  const progress = Number(report.progress);
  if (Number.isFinite(progress)) return Math.min(Math.max(Math.round(progress), 0), 100);
  if (report.status === "Resolved") return 100;
  if (report.status === "In Progress") return 50;
  return 10;
};

const createIssuePopup = (item) => {
  const content = document.createElement("div");
  content.className = "eco-map-popup-content";

  const status = document.createElement("span");
  status.className = `eco-status ${statusClass(item.status)}`;
  status.textContent = item.status;

  const title = document.createElement("h3");
  title.textContent = item.issue;

  const details = document.createElement("p");
  details.textContent = `${item.reportNumber} | ${item.location}`;

  const description = document.createElement("p");
  description.className = "eco-map-popup-description";
  description.textContent = item.description || "No description provided.";

  const progress = document.createElement("div");
  progress.className = "eco-map-popup-progress";
  const progressText = document.createElement("span");
  progressText.textContent = `Progress ${item.progress}%`;
  const progressTrack = document.createElement("i");
  const progressFill = document.createElement("b");
  progressFill.style.width = `${item.progress}%`;
  progressTrack.append(progressFill);
  progress.append(progressText, progressTrack);
  content.append(status, title, details, description, progress);

  return content;
};

const spreadOverlappingPins = (items) => {
  const byCoordinate = items.reduce((groups, item) => {
    const key = `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
    groups[key] = [...(groups[key] || []), item];
    return groups;
  }, {});

  return Object.values(byCoordinate).flatMap((group) => {
    if (group.length === 1) return group;

    return group.map((item, index) => {
      const angle = (Math.PI * 2 * index) / group.length - Math.PI / 2;
      const radius = 0.000065;
      return {
        ...item,
        pinLat: item.lat + Math.sin(angle) * radius,
        pinLng: item.lng + Math.cos(angle) * radius,
      };
    });
  });
};

const buildHeatmapFeatureCollection = (items) => {
  const frequencyByBlock = items.reduce((counts, item) => {
    counts[item.block] = (counts[item.block] || 0) + 1;
    return counts;
  }, {});

  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      properties: {
        block: item.block,
        weight: frequencyByBlock[item.block],
      },
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
    })),
  };
};

const buildZoneFeatureCollection = (items) => {
  const grouped = items.reduce((groups, item) => {
    if (!groups[item.block]) groups[item.block] = { ...item, totalCount: 0, activeCount: 0 };
    groups[item.block].totalCount += 1;
    if (!isResolved(item.status)) groups[item.block].activeCount += 1;
    return groups;
  }, {});

  return {
    type: "FeatureCollection",
    features: Object.values(grouped).map((item) => {
      const frequency = item.activeCount >= 3 ? "danger" : item.activeCount === 2 ? "warning" : item.activeCount === 1 ? "attention" : "resolved";

      return {
      type: "Feature",
      properties: {
        block: item.block,
        totalCount: item.totalCount,
        activeCount: item.activeCount,
        frequency,
      },
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
      };
    }),
  };
};

const buildCampusBlockFeatureCollection = (items) => {
  const counts = items.reduce((all, item) => {
    const current = all[item.block] || { totalCount: 0, activeCount: 0 };
    current.totalCount += 1;
    if (!isResolved(item.status)) current.activeCount += 1;
    all[item.block] = current;
    return all;
  }, {});

  return {
    ...campusBlocks,
    features: campusBlocks.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        ...(counts[feature.properties.name] || { totalCount: 0, activeCount: 0 }),
      },
    })),
  };
};

const addIssueLayers = (map) => {
  map.addSource("campus-boundary", { type: "geojson", data: CAMPUS_BOUNDARY });
  map.addLayer({
    id: "campus-boundary-fill", type: "fill", source: "campus-boundary",
    paint: { "fill-color": "#9ae6b4", "fill-opacity": 0.08 },
  });
  map.addLayer({
    id: "campus-boundary-line", type: "line", source: "campus-boundary",
    paint: { "line-color": "#166534", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.8 },
  });
  map.addSource("campus-block-areas", {
    type: "geojson",
    data: buildCampusBlockFeatureCollection([]),
  });
  map.addLayer({
    id: "campus-block-fill",
    type: "fill",
    source: "campus-block-areas",
    paint: {
      "fill-color": [
        "case",
        ["==", ["get", "landmark"], true], "#cbd5e1",
        ["==", ["get", "activeCount"], 0], "#bbf7d0",
        ["==", ["get", "activeCount"], 1], "#fde68a",
        ["==", ["get", "activeCount"], 2], "#fdba74",
        "#fca5a5",
      ],
      "fill-opacity": [
        "case",
        ["==", ["get", "landmark"], true], 0.38,
        ["==", ["get", "activeCount"], 0], 0.15,
        0.28,
      ],
    },
  });
  map.addLayer({
    id: "campus-block-outline",
    type: "line",
    source: "campus-block-areas",
    paint: {
      "line-color": [
        "case",
        ["==", ["get", "landmark"], true], "#64748b",
        ["==", ["get", "activeCount"], 0], "#15803d",
        ["==", ["get", "activeCount"], 1], "#ca8a04",
        ["==", ["get", "activeCount"], 2], "#ea580c",
        "#dc2626",
      ],
      "line-width": 1.5,
      "line-opacity": 0.9,
    },
  });
  map.addSource("active-issue-heatmap", { type: "geojson", data: buildHeatmapFeatureCollection([]) });
  map.addLayer({
    id: "active-issue-heatmap",
    type: "heatmap",
    source: "active-issue-heatmap",
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 1, 0.45, 3, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 15, 0.7, 18, 1.35],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 15, 28, 18, 72],
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(255, 255, 255, 0)",
        0.2, "rgba(250, 204, 21, 0.22)",
        0.45, "rgba(249, 115, 22, 0.42)",
        0.7, "rgba(239, 68, 68, 0.68)",
        1, "rgba(153, 27, 27, 0.9)",
      ],
      "heatmap-opacity": 0.8,
    },
  });
  map.addSource("issue-zones", { type: "geojson", data: buildZoneFeatureCollection([]) });
  map.addLayer({
    id: "issue-zone-halos", type: "circle", source: "issue-zones",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "activeCount"], 0, 24, 1, 32, 2, 48, 3, 68],
      "circle-color": [
        "match", ["get", "frequency"],
        "danger", "#dc2626",
        "warning", "#f97316",
        "attention", "#eab308",
        "#16a34a",
      ],
      "circle-opacity": 0.28,
      "circle-blur": 0.35,
    },
  });
  map.addLayer({
    id: "issue-zone-rings", type: "circle", source: "issue-zones",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "activeCount"], 0, 14, 1, 20, 2, 28, 3, 38],
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-stroke-color": [
        "match", ["get", "frequency"],
        "danger", "#dc2626",
        "warning", "#f97316",
        "attention", "#eab308",
        "#16a34a",
      ],
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.8,
    },
  });
  map.addLayer({
    id: "campus-block-labels",
    type: "symbol",
    source: "campus-block-areas",
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-offset": [0, 1.2],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#12365c",
      "text-halo-color": "rgba(255, 255, 255, 0.96)",
      "text-halo-width": 1.4,
    },
  });
};

const Transparencymap = ({ embedded = false, onIssueSelect, categoryFilter = "All" }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const popupRefs = useRef([]);
  const [reports, setReports] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [error, setError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapMode, setMapMode] = useState("local");

  useEffect(() => {
    const syncReports = async () => {
      try {
        setReports(await getReports());
        setError("");
      } catch (err) {
        setReports(fallbackReports);
        setError(err.message ? `Live report fetch failed: ${err.message}` : "Live report fetch failed.");
      }
    };
    syncReports();
    const refreshTimer = window.setInterval(syncReports, 15000);
    window.addEventListener("eco-reports-changed", syncReports);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("eco-reports-changed", syncReports);
    };
  }, []);

  const mappedIssues = useMemo(() => reports
    .filter((report) => categoryFilter === "All" || (report.category || report.type || "General") === categoryFilter)
    .map((report, index) => {
    const block = pickBlock(report);
    const fallbackCoords = getCampusPoint(block, index);
    const savedPoint = { lat: report.latitude, lng: report.longitude };
    const hasCampusCoordinates = isPointInsideCampus(savedPoint);
    return {
      reportNumber: report.reportNumber,
      issue: report.type || report.category || "Eco Issue",
      status: report.status,
      block,
      location: report.location || `${block} - General Area`,
      zone: fallbackCoords.zone,
      lat: hasCampusCoordinates ? savedPoint.lat : fallbackCoords.lat,
      lng: hasCampusCoordinates ? savedPoint.lng : fallbackCoords.lng,
      date: report.date || report.createdAt || "",
      description: report.description || "",
      progress: getProgress(report),
      assignedWorker: report.assignedWorker || report.department || "Unassigned",
    };
    }), [categoryFilter, reports]);

  const pendingIssues = useMemo(() => mappedIssues.filter((item) => !isResolved(item.status)), [mappedIssues]);
  const pinIssues = useMemo(() => spreadOverlappingPins(mappedIssues), [mappedIssues]);
  const resolvedIssues = useMemo(() => mappedIssues.filter((item) => isResolved(item.status)), [mappedIssues]);
  const recentIssues = useMemo(() => [...mappedIssues].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 4), [mappedIssues]);
  const mostAffectedArea = useMemo(() => {
    const counts = mappedIssues.reduce((all, item) => ({ ...all, [item.block]: (all[item.block] || 0) + 1 }), {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ["No data", 0];
  }, [mappedIssues]);

  const focusIssue = useCallback((item) => {
    setSelectedIssue(item);
    onIssueSelect?.(item);
    popupRefs.current.forEach((popup) => popup.remove());
    const map = mapRef.current;
    if (map) map.flyTo({ center: [item.lng, item.lat], zoom: Math.max(map.getZoom(), 17), essential: true });
  }, [onIssueSelect]);

  const finishMapStyle = useCallback((map) => {
    addIssueLayers(map);
    fitCampusView(map);
    setIsMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [BAIET_CAMPUS_CENTER.lng, BAIET_CAMPUS_CENTER.lat],
      zoom: 16.4,
      minZoom: 15,
      maxZoom: 19,
      maxBounds: CAMPUS_BOUNDS,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.on("click", () => setSelectedIssue(null));
    map.on("resize", () => fitCampusView(map));
    map.once("load", () => finishMapStyle(map));

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      popupRefs.current.forEach((popup) => popup.remove());
      markerRefs.current = [];
      popupRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [finishMapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setIsMapReady(false);
    markerRefs.current.forEach((marker) => marker.remove());
    popupRefs.current.forEach((popup) => popup.remove());
    markerRefs.current = [];
    popupRefs.current = [];
    map.setStyle(mapMode === "satellite" ? SATELLITE_STYLE : OPENFREEMAP_STYLE);
    map.once("style.load", () => finishMapStyle(map));
  }, [finishMapStyle, mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    map.getSource("issue-zones")?.setData(buildZoneFeatureCollection(mappedIssues));
    map.getSource("campus-block-areas")?.setData(buildCampusBlockFeatureCollection(mappedIssues));
    map.getSource("active-issue-heatmap")?.setData(buildHeatmapFeatureCollection(pendingIssues));
    markerRefs.current.forEach((marker) => marker.remove());
    popupRefs.current.forEach((popup) => popup.remove());
    popupRefs.current = [];
    markerRefs.current = pinIssues.map((item) => {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `eco-map-pin ${statusClass(item.status)}`;
      markerElement.setAttribute("aria-label", `${item.issue}: ${item.status}`);
      markerElement.addEventListener("click", (event) => {
        event.stopPropagation();
        focusIssue(item);
      });
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 20,
        className: "eco-map-popup",
      }).setLngLat([item.pinLng || item.lng, item.pinLat || item.lat]).setDOMContent(createIssuePopup(item));
      popupRefs.current.push(popup);
      markerElement.addEventListener("mouseenter", () => {
        popupRefs.current.forEach((openPopup) => {
          if (openPopup !== popup) openPopup.remove();
        });
        popup.addTo(map);
      });
      markerElement.addEventListener("mouseleave", () => popup.remove());
      return new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
        .setLngLat([item.pinLng || item.lng, item.pinLat || item.lat])
        .addTo(map);
    });
  }, [focusIssue, isMapReady, mappedIssues, pendingIssues, pinIssues]);

  return (
    <>
      {embedded ? null : <Header />}
      <section className="eco-map-page">
        {error ? <p className="auth-alert auth-alert-error eco-map-error">{error}</p> : null}
        <div className="eco-campus-map">
          <div ref={mapContainerRef} className="map-container" />
          <div className="eco-map-title">
            <p>Campus transparency</p>
            <h1>Transparency Map</h1>
            <span>Bannari Amman Institute of Technology</span>
          </div>
          <div className="map-view-switcher" role="tablist" aria-label="Map view">
            <button type="button" role="tab" aria-selected={mapMode === "local"} className={mapMode === "local" ? "active" : ""} onClick={() => setMapMode("local")}>Map</button>
            <button type="button" role="tab" aria-selected={mapMode === "satellite"} className={mapMode === "satellite" ? "active" : ""} onClick={() => setMapMode("satellite")}>Satellite</button>
          </div>
          {selectedIssue ? (
            <aside className="map-issue-overlay">
              <button type="button" className="map-issue-close" onClick={() => setSelectedIssue(null)} aria-label="Close report details">x</button>
              <span className={`eco-status ${statusClass(selectedIssue.status)}`}>{selectedIssue.status}</span>
              <h2>{selectedIssue.issue}</h2>
              <p>{selectedIssue.reportNumber}</p>
              <p><strong>{selectedIssue.block}</strong> - {selectedIssue.zone}</p>
              <p>{selectedIssue.description || "No description provided."}</p>
              <div className="map-issue-progress">
                <span>Live progress</span>
                <strong>{selectedIssue.progress}%</strong>
                <i><b style={{ width: `${selectedIssue.progress}%` }} /></i>
              </div>
            </aside>
          ) : null}
          <div className="eco-map-legend">
            <span><i className="legend-dot frequency-low" /> 1 active issue</span>
            <span><i className="legend-dot frequency-medium" /> 2 active issues</span>
            <span><i className="legend-dot frequency-high" /> Heatmap danger zone</span>
            <span><i className="legend-dot resolved" /> Resolved</span>
          </div>
        </div>
        <div className="eco-map-summary">
          <div className="eco-recent-panel">
            <div className="eco-summary-head"><h2>Recent Issues</h2><span>{mappedIssues.length} total</span></div>
            <div className="eco-issue-table">
              <div className="eco-issue-row eco-issue-row-head"><span>Report</span><span>Location</span><span>Category</span><span>Status</span></div>
              {recentIssues.map((item) => (
                <button type="button" key={item.reportNumber} className="eco-issue-row" onClick={() => focusIssue(item)}>
                  <span>{item.reportNumber}</span><span>{item.block}</span><span>{item.issue}</span><span className={`eco-status ${statusClass(item.status)}`}>{item.status}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="eco-count-panel">
            <strong>{mappedIssues.length}</strong><span>Total Issues</span>
            <p><i className="legend-dot resolved" /> {resolvedIssues.length} resolved</p>
            <p><i className="legend-dot pending" /> {pendingIssues.length} active</p>
            <small>{mostAffectedArea[0]} is most reported</small>
          </div>
        </div>
      </section>
    </>
  );
};

export default Transparencymap;
