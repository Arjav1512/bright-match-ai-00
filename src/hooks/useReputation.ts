import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReputationData {
  reputation_score: number;
  breakdown: {
    internship_score: number;
    skill_score: number;
    feedback_score: number;
    profile_score: number;
  };
}

export function useReputation(studentId?: string) {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReputation = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("student-reputation", {
        method: "GET",
        body: undefined,
        headers: { "Content-Type": "application/json" },
      });

      // Since invoke doesn't support GET with query params easily, use POST recalculate for own score
      // or fetch directly from the table
      const { data: sp, error: dbError } = await supabase
        .from("student_profiles")
        .select("reputation_score, completed_internships, skill_test_score, company_feedback_score, profile_strength_score")
        .eq("user_id", studentId)
        .single();

      if (dbError || !sp) {
        setError("Could not fetch reputation");
        setLoading(false);
        return;
      }

      setData({
        reputation_score: Number(sp.reputation_score),
        breakdown: {
          internship_score: Math.min((sp.completed_internships || 0) * 10, 40),
          skill_score: Number(sp.skill_test_score),
          feedback_score: Number(sp.company_feedback_score),
          profile_score: Number(sp.profile_strength_score),
        },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const recalculate = useCallback(async () => {
    const { data: result, error } = await supabase.functions.invoke("student-reputation", {
      body: { action: "recalculate" },
    });
    if (!error && result) {
      setData({
        reputation_score: Number(result.reputation_score),
        breakdown: {
          internship_score: Math.min((result.completed_internships || 0) * 10, 40),
          skill_score: Number(result.skill_test_score),
          feedback_score: Number(result.company_feedback_score),
          profile_score: Number(result.profile_strength_score),
        },
      });
    }
    return { error };
  }, []);

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  return { data, loading, error, recalculate, refetch: fetchReputation };
}
