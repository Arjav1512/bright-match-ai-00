import { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Sparkles, Search, MapPin, Loader2 } from "lucide-react";
import { CircleBubblesSkeleton } from "@/components/skeletons";
import Footer from "@/components/Footer";
import LocalCommunityGroups from "@/components/LocalCommunityGroups";
import { usePeerUpCircles, PeerUpCircle } from "@/hooks/usePeerUpCircles";
import CircleBubbles from "@/components/peerup/CircleBubbles";
import CircleDetailModal from "@/components/peerup/CircleDetailModal";
import CreateCircleForm from "@/components/peerup/CreateCircleForm";
import { Card, CardContent } from "@/components/ui/card";
import {
  getStoredLocation,
  requestBrowserLocation,
  distanceKm,
  NEARBY_RADIUS_KM,
  StoredLocation,
} from "@/lib/userLocation";

const CampusCommunity = () => {
  const { user } = useAuth();
  const {
    circles, loading, createCircle, requestToJoin,
    fetchRequests, handleRequest, approveAll,
    fetchParticipants, deleteCircle, refresh, fetchCredentials,
  } = usePeerUpCircles();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<PeerUpCircle | null>(null);
  const [search, setSearch] = useState("");

  const [location, setLocation] = useState<StoredLocation | null>(getStoredLocation);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const askLocation = useCallback(async () => {
    setLocating(true);
    setLocationError("");
    try {
      const loc = await requestBrowserLocation();
      setLocation(loc);
    } catch (e: any) {
      setLocationError(e.message || "Could not get your location.");
    } finally {
      setLocating(false);
    }
  }, []);

  // Request location automatically on mount if not already granted
  useEffect(() => {
    if (!getStoredLocation()) {
      askLocation();
    }
  }, [askLocation]);

  // Online circles are visible to everyone regardless of location.
  // Offline circles remain gated by the 5 km radius.
  const visibleByLocation = useMemo(() => {
    return circles.filter((c) => {
      if (c.mode === "online") return true;
      if (!location) return false;
      if (c.latitude == null || c.longitude == null) return false;
      return distanceKm(location.lat, location.lng, c.latitude, c.longitude) <= NEARBY_RADIUS_KM;
    });
  }, [circles, location]);

  const visibleCircles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? visibleByLocation.filter((c) =>
          [c.spot_name, c.topic, c.spot_location, c.additional_info, c.fuel_type, c.creator_name]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(q))
        )
      : visibleByLocation;
    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [visibleByLocation, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">PeerUp</h1>
          <p className="text-muted-foreground mt-1">
            Wroob Circles & groups vanish after 24 hours. No traces, just vibes.
          </p>
        </div>

        {/* Location banner */}
        <Card className="border-primary/20">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${location ? "text-emerald-600" : "text-muted-foreground"}`} />
              {location ? (
                <span className="text-muted-foreground">
                  Showing <span className="font-medium text-foreground">Online</span> Wroob Circles from everywhere,
                  and <span className="font-medium text-foreground">Offline</span> ones within{" "}
                  <span className="font-medium text-foreground">{NEARBY_RADIUS_KM} km</span> of you.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Online Wroob Circles are always visible. Enable location to also see offline circles within {NEARBY_RADIUS_KM} km.
                </span>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={askLocation} disabled={locating} className="gap-1.5">
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
              {location ? "Update location" : "Enable location"}
            </Button>
          </CardContent>
        </Card>
        {locationError && <p className="text-sm text-destructive -mt-3">{locationError}</p>}

        <Tabs defaultValue="campus" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="campus">Create Wroob Circle</TabsTrigger>
            <TabsTrigger value="groups">Wroob Circle Groups</TabsTrigger>
          </TabsList>

          {/* Wroob Circles tab */}
          <TabsContent value="campus" className="space-y-6 mt-6">
            {showCreateForm && (
              <CreateCircleForm
                onSubmit={createCircle}
                onClose={() => setShowCreateForm(false)}
                userLat={location?.lat ?? null}
                userLng={location?.lng ?? null}
              />
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Wroob Circles by topic, spot, or creator..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Wroob Circles nearby
              </h2>
              <Button variant="ghost" size="sm" onClick={refresh} className="gap-1 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>

            {loading ? (
              <CircleBubblesSkeleton />
            ) : visibleCircles.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <h3 className="font-medium mb-1">
                    {search
                      ? "No matching circles"
                      : location
                      ? "No circles nearby or online yet"
                      : "No online circles yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {!location
                      ? `Enable location to also see offline circles within ${NEARBY_RADIUS_KM} km, or create one yourself.`
                      : "Be the first to create a Wroob Circle!"}
                  </p>
                  <Button onClick={() => setShowCreateForm(true)} className="brand-gradient border-0 text-white">
                    Create Wroob Circle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <CircleBubbles
                circles={visibleCircles}
                onSelect={(c) => setSelectedCircle(c)}
                onCreateNew={() => setShowCreateForm(true)}
              />
            )}

            <CircleDetailModal
              circle={selectedCircle}
              open={!!selectedCircle}
              onClose={() => setSelectedCircle(null)}
              onRequestJoin={requestToJoin}
              onFetchRequests={fetchRequests}
              onHandleRequest={handleRequest}
              onApproveAll={approveAll}
              onFetchParticipants={fetchParticipants}
              onFetchCredentials={fetchCredentials}
              onDelete={deleteCircle}
            />
          </TabsContent>

          {/* Local Groups tab */}
          <TabsContent value="groups" className="mt-6">
            <LocalCommunityGroups
              userLocation={location}
              onRequestLocation={askLocation}
              locating={locating}
            />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default CampusCommunity;
