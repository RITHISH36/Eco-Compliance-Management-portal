import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Header from "./Header"
import { createIssueReport } from "../utils/reportStore";
import { CAMPUS_BLOCKS, normalizeCampusBlock } from "../utils/campusBlocks";
import { getCurrentUser } from "../utils/session";
import {
    BAIET_CAMPUS_BOUNDS,
    BAIET_CAMPUS_CENTER,
    getBlockPoint,
    isPointInsideCampus,
} from "../utils/campusMap";
import { useToast } from "./ui/ToastProvider";

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

const Reportissue = () => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [isfile, setisfile] = useState(null)
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [block, setBlock] = useState(CAMPUS_BLOCKS[0]);
    const [spot, setSpot] = useState("");
    const [submitMessage, setSubmitMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState(() => getBlockPoint(CAMPUS_BLOCKS[0]));
    const [locationMode, setLocationMode] = useState("block");
    const [locationStatus, setLocationStatus] = useState("Trying to detect your current location...");
    const [mapMode, setMapMode] = useState("local");
    const toast = useToast();

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
            attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
        map.once("load", () => map.fitBounds(CAMPUS_BOUNDS, { padding: 24, duration: 0 }));

        return () => {
            markerRef.current?.remove();
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const updateStyle = () => map.fitBounds(CAMPUS_BOUNDS, { padding: 24, duration: 0 });
        map.setStyle(mapMode === "satellite" ? SATELLITE_STYLE : OPENFREEMAP_STYLE);
        map.once("style.load", updateStyle);

        return () => map.off("style.load", updateStyle);
    }, [mapMode]);

    useEffect(() => {
        if (!mapRef.current || !selectedPoint) return;

        markerRef.current?.remove();
        const markerElement = document.createElement("div");
        markerElement.className = "report-map-marker";
        markerRef.current = new maplibregl.Marker({ element: markerElement })
            .setLngLat([selectedPoint.lng, selectedPoint.lat])
            .addTo(mapRef.current);
    }, [selectedPoint]);
    const handleDetectedLocation = (point) => {
        if (isPointInsideCampus(point)) {
            setSelectedPoint(point);
            setLocationMode("gps");
            setLocationStatus("Current device location tagged inside the BIT campus.");
            return;
        }

        setLocationMode("block");
        setSelectedPoint(getBlockPoint(block));
        setLocationStatus("Device location is outside BIT campus. Using the selected block center.");
    };
    const handlefile = (e) => {
        const selectedffile = e.target.files[0]
        if (selectedffile) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setisfile(typeof reader.result === "string" ? reader.result : null)
            }
            reader.readAsDataURL(selectedffile)
        }
        else {
            setisfile(null)
        }
    }
    const handleremove = () => {
        setisfile(null)
    }

    useEffect(() => {
        if (locationMode !== "gps") {
            setSelectedPoint(getBlockPoint(block))
            setLocationStatus(`Using ${block} center until browser location is available.`)
        }
    }, [block])

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationMode("block")
            setSelectedPoint(getBlockPoint(block))
            setLocationStatus("Browser location is unavailable. Using selected block center.")
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleDetectedLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            () => {
                setLocationMode("block")
                setSelectedPoint(getBlockPoint(block))
                setLocationStatus("Location permission denied. Using selected block center.")
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        )
    }, [])

    const detectCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationMode("block")
            setSelectedPoint(getBlockPoint(block))
            setLocationStatus("Browser location is unavailable. Using selected block center.")
            return
        }

        setLocationStatus("Refreshing current location...")
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleDetectedLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            () => {
                setLocationMode("block")
                setSelectedPoint(getBlockPoint(block))
                setLocationStatus("Could not read current location. Using selected block center.")
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        )
    }

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim() || !block.trim() || !selectedPoint) {
            setSubmitMessage("Please fill title, description, and block.");
            return;
        }

        const normalizedBlock = normalizeCampusBlock(block);
        const currentUser = getCurrentUser();

        try {
            setIsSubmitting(true);
            const report = await createIssueReport({
                type: title.trim(),
                category: title.trim(),
                description: description.trim(),
                block: normalizedBlock,
                spot: spot.trim(),
                latitude: selectedPoint.lat,
                longitude: selectedPoint.lng,
                reporterId: currentUser?.id || "",
                reporterEmail: currentUser?.email || "",
                contactInfo: currentUser?.email || "",
                assigneeContact: "",
                images: isfile
                    ? [{ src: isfile, name: "uploaded-image.jpg" }]
                    : [{ src: "/backgroundimg.jpg", name: "no-image.jpg" }],
            });
            const message = `Report submitted successfully. ID: ${report.reportNumber}`;
            setSubmitMessage(message);
            toast.success(message);
            setTitle("");
            setDescription("");
            setBlock(CAMPUS_BLOCKS[0]);
            setSpot("");
            setSelectedPoint(getBlockPoint(CAMPUS_BLOCKS[0]));
            setisfile(null);
        } catch (error) {
            const message = error.message || "Unable to submit report.";
            setSubmitMessage(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Header />
            <div className="reportissue">
                <div className="report-head">
                    <h1>Report Your Issue</h1>
                    <p>Describe the issue, choose the block, and we will auto-tag the complaint using your current device location.</p>
                </div>
                <div className="report-ctn">
                    <div className="report-form-side">
                        <div className="title-inp">
                            <label htmlFor="title">Title</label>
                            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="desc-inp">
                            <label htmlFor="desc">Description</label>
                            <input type="text" id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="loc-inp">
                            <label htmlFor="block">Block</label>
                            <select id="block" value={block} onChange={(e) => setBlock(e.target.value)}>
                                {CAMPUS_BLOCKS.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </div>
                        <div className="loc-inp">
                            <label htmlFor="spot">Specific Spot (optional)</label>
                            <input
                                type="text"
                                id="spot"
                                placeholder="e.g. 2nd Floor Corridor"
                                value={spot}
                                onChange={(e) => setSpot(e.target.value)}
                            />
                        </div>
                        <div className="img-inp">
                            <label htmlFor="img">Image</label>
                            <input type="file" accept="image/*" onChange={handlefile} id="img" />
                        </div>
                        {isfile && (
                            <div className="img-prev">
                                <img src={isfile} alt="Preview" />
                                <button type="button" onClick={handleremove}>x</button>
                            </div>)}
                        <div className="emg-btn">
                            <input type="checkbox" id="img" />
                            <label htmlFor="emg">Mark As Emergency</label>
                        </div>
                        <div className="sub-btn">
                            <button type="button" onClick={handleSubmit} className={isSubmitting ? "btn-loading" : ""} disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </button>
                        </div>
                    </div>

                    <div className="report-map-side">
                        <div className="map-picker-card">
                            <div className="map-picker-head">
                                <label>Auto-Tagged Campus Location</label>
                                <span>Location is captured from your device when permission is enabled.</span>
                            </div>
                            <div className="report-map-toolbar" role="tablist" aria-label="Report location map type">
                                <button type="button" role="tab" aria-selected={mapMode === "local"} className={mapMode === "local" ? "active" : ""} onClick={() => setMapMode("local")}>Map</button>
                                <button type="button" role="tab" aria-selected={mapMode === "satellite"} className={mapMode === "satellite" ? "active" : ""} onClick={() => setMapMode("satellite")}>Satellite</button>
                            </div>
                            <div className="report-map-shell" ref={mapContainerRef}>
                            </div>
                            <div className="map-pin-summary">
                                <div>
                                    <strong>Location Source</strong>
                                    <span>{locationMode === "gps" ? "Current Device Location" : `${block} Block Center`}</span>
                                </div>
                                <div>
                                    <strong>Tagged Coordinates</strong>
                                    <span>
                                        {selectedPoint
                                            ? `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`
                                            : "No location selected"}
                                    </span>
                                </div>
                            </div>
                            <p className="map-picker-note">
                                {locationStatus}
                            </p>
                            <button type="button" className="map-refresh-btn" onClick={detectCurrentLocation}>
                                Refresh Current Location
                            </button>
                        </div>
                    </div>
                    {submitMessage ? <p className="auth-alert">{submitMessage}</p> : null}
                </div>
            </div>
        </>
    )
}
export default Reportissue;
