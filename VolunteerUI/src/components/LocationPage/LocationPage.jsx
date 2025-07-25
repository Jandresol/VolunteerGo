import "./LocationPage.css";
import React, { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import * as Geocode from "react-geocode";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router";
import { MdLocationOn } from "react-icons/md";
import { useProfile } from "../../contexts/ProfileContext";
import { useOpportunity } from "../../contexts/OpportunityContext";
import MapSearch from "../MapSearch/MapSearch"; 

function LocationPage() {
  Geocode.setKey(import.meta.env.VITE_GOOGLE_GEOCODE_API_KEY);
  const [coords, setCoords] = useState([]);
  const [userLatLng, setUserLatLng] = useState({ lat: 37.7749, lng: -122.4194 }); // default SF coords
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);
  const { user, token, isLoaded } = useAuth();
  const { profile } = useProfile();
  const { opportunities, loading, fetchOpportunities } = useOpportunity();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && user && token) {
      if (profile?.location) {
        Geocode.fromAddress(profile.location)
          .then((response) => {
            const loc = response.results[0].geometry.location;
            setUserLatLng(loc);
          })
          .catch((err) => {
            console.error("Error geocoding profile location:", err);
          });
      }
      fetchOpportunities(); // Load opportunities into context
    }
  }, [isLoaded, user, token, profile, fetchOpportunities]);

  useEffect(() => {
    // When opportunities update, geocode all their locations
    const geocodeOpportunities = async () => {
      if (!opportunities || opportunities.length === 0) {
        setCoords([]);
        return;
      }

      const coordsArr = await Promise.all(
        opportunities.map(async (o) => {
          try {
            const response = await Geocode.fromAddress(o.location);
            const { lat, lng } = response.results[0].geometry.location;
            return { id: o.id, position: { lat, lng }, title: o.name };
          } catch (error) {
            console.error("Error fetching coordinates for", o.location, ":", error);
            return { id: o.id, position: { lat: 37.7749, lng: -122.4194 }, title: "Can't find Title" };
          }
        })
      );

      setCoords(coordsArr);
    };

    geocodeOpportunities();
  }, [opportunities]);

  if (!isLoaded) {
    return <div>Loading user data...</div>;
  }

  if (loading) {
    return <div>Loading opportunities...</div>;
  }

  return (
    <>
        <APIProvider
          apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={["places"]}
          onLoad={() => {
            console.log("Google Maps API fully loaded ✅");
            setMapsApiLoaded(true);
          }}>
        <div className="map-container" style={{ position: "relative" }}>
        {mapsApiLoaded && (
          <MapSearch onPlaceSelect={(coords) => setUserLatLng(coords)} />
        )}
          <Map
            key={`${userLatLng.lat}-${userLatLng.lng}`} // re-center map when coords change
            mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
            defaultCenter={userLatLng}
            defaultZoom={10}
            onCameraChanged={(ev) =>
              console.log("camera changed:", ev.detail.center, "zoom:", ev.detail.zoom)}
          >
            {coords.map((c) => (
              <AdvancedMarker
                key={c.id}
                position={c.position}
                title={c.title}
                onClick={() => navigate(`/opportunity/${c.id}`)}
              >
                <MdLocationOn className="marker-icon" />
              </AdvancedMarker>
            ))}
          </Map>
        </div>
      </APIProvider>
    </>
  );
}

export default LocationPage;
