import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Lightbulb, Coffee, Clock, Loader2, X, Video, Link2, KeyRound, User, Info, Users, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PeerUpMode } from "@/hooks/usePeerUpCircles";

interface CreateCircleFormProps {
  onSubmit: (data: {
    spot_name: string;
    spot_location?: string;
    topic: string;
    fuel_type?: string;
    additional_info?: string;
    mode: PeerUpMode;
    drop_in_time: string;
    meeting_link?: string;
    meeting_login_id?: string;
    meeting_password?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => Promise<void>;
  onClose: () => void;
  userLat?: number | null;
  userLng?: number | null;
}

const CreateCircleForm = ({ onSubmit, onClose, userLat, userLng }: CreateCircleFormProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<PeerUpMode | null>(null);
  const [spotLocation, setSpotLocation] = useState("");
  const [topic, setTopic] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [dropInDate, setDropInDate] = useState("");
  const [dropInTime, setDropInTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingLoginId, setMeetingLoginId] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValidUrl = (u: string) => {
    try { const url = new URL(u); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; }
  };

  const handleSubmit = async () => {
    if (!mode) return;
    const commonMissing = !spotLocation.trim() || !topic.trim() || !dropInDate || !dropInTime;
    if (commonMissing) {
      toast({ title: "Missing fields", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (mode === "offline" && !fuelType.trim()) {
      toast({ title: "Missing fuel", description: "Fuel of the Session is required", variant: "destructive" });
      return;
    }
    if (mode === "online") {
      if (!meetingLink.trim() || !isValidUrl(meetingLink.trim())) {
        toast({ title: "Invalid meeting link", description: "Enter a valid https:// URL", variant: "destructive" });
        return;
      }
    }

    const dateTime = new Date(`${dropInDate}T${dropInTime}`);
    if (dateTime <= new Date()) {
      toast({ title: "Invalid time", description: "Drop-in time must be in the future", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        spot_name: spotLocation.trim(),
        spot_location: spotLocation.trim(),
        topic: topic.trim(),
        mode,
        fuel_type: mode === "offline" ? fuelType.trim() : undefined,
        additional_info: mode === "online" ? additionalInfo.trim() : undefined,
        drop_in_time: dateTime.toISOString(),
        meeting_link: mode === "online" ? meetingLink.trim() : undefined,
        meeting_login_id: mode === "online" ? meetingLoginId.trim() : undefined,
        meeting_password: mode === "online" ? meetingPassword.trim() : undefined,
      });
      toast({ title: "Circle created!", description: "Your Wroob Circle is now live." });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {mode === null ? "New Wroob Circle" : mode === "online" ? "Online Wroob Circle" : "Offline Wroob Circle"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === null && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose the type of Wroob Circle you want to create.</p>
            <button
              type="button"
              onClick={() => setMode("offline")}
              className="w-full text-left rounded-xl border p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-start gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Offline Wroob Circle</p>
                <p className="text-xs text-muted-foreground">Meet in person at a spot on/near campus.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("online")}
              className="w-full text-left rounded-xl border p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-start gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Online Wroob Circle</p>
                <p className="text-xs text-muted-foreground">
                  Host over Google Meet, Zoom, Microsoft Teams, or any meeting link.
                </p>
              </div>
            </button>
          </div>
        )}

        {mode !== null && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setMode(null)} className="gap-1 text-xs -mt-2">
              ← Change type
            </Button>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {mode === "online" ? "Wroob Circle Name *" : "Spot Location *"}
              </Label>
              <Input
                placeholder={mode === "online"
                  ? "e.g. AI Founders Roundtable"
                  : "e.g. A-Block Hotspot, Bennett University"}
                value={spotLocation}
                onChange={(e) => setSpotLocation(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Lightbulb className="h-3.5 w-3.5 text-warning" /> Topic on the Table *
              </Label>
              <Input
                placeholder="e.g. The AI Surge / Your Next Big Startup Move"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={200}
              />
            </div>

            {mode === "offline" ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Coffee className="h-3.5 w-3.5 text-amber-600" /> Fuel of the Session *
                </Label>
                <Input
                  placeholder="e.g. Chai Gang or Black Coffee Crew"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  maxLength={100}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Info className="h-3.5 w-3.5 text-primary" /> Additional Information
                </Label>
                <Textarea
                  placeholder="Session benefits — e.g. E-certificate, internship / networking opportunities, industry exposure, or any notes participants should know."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
                <p className="text-[11px] text-muted-foreground">Visible to everyone before they request to join.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Date *
                </Label>
                <Input
                  type="date"
                  value={dropInDate}
                  onChange={(e) => setDropInDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Time *
                </Label>
                <Input
                  type="time"
                  value={dropInTime}
                  onChange={(e) => setDropInTime(e.target.value)}
                />
              </div>
            </div>

            {mode === "online" && (
              <div className="space-y-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Access details (revealed only after approval)</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Link2 className="h-3.5 w-3.5" /> Meeting Link *
                  </Label>
                  <Input
                    placeholder="https://meet.google.com/... or Zoom / Teams link"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    maxLength={500}
                    type="url"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5" /> Login ID
                    </Label>
                    <Input
                      placeholder="Optional"
                      value={meetingLoginId}
                      onChange={(e) => setMeetingLoginId(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <KeyRound className="h-3.5 w-3.5" /> Password
                    </Label>
                    <Input
                      placeholder="Optional"
                      value={meetingPassword}
                      onChange={(e) => setMeetingPassword(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full brand-gradient border-0 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Post
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CreateCircleForm;
