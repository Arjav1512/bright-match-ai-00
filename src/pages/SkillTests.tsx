import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const SkillTests = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-lg py-20">
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <Sparkles className="h-14 w-14 text-primary mx-auto" />
            <h1 className="font-display text-3xl font-bold">Skill Tests</h1>
            <p className="text-lg text-muted-foreground">Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              We're working on something great. Check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SkillTests;
