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

/**
 * FIX (HIGH-5 + HIGH-6):
 * - fetchReputation now reads student_profiles directly via a SELECT (no write side-effects).
 * - The studentId parameter is correctly forwarded so employers viewing a candidate
 *   see that candidate's score, not their own.
 * - recalculate() is an explicit action, called only when a score update is needed
 *   (e.g., after completing a skill test), not on every component mount.
 */
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
    setError(null);
    try {
      // READ-ONLY: query student_profiles directly — no edge function, no write side-effect.
      // RLS allows: the student themselves, employers (viewing candidates), and admins.
      const { data: sp, error: spError } = await supabase
        .from("student_profiles")
        .select("reputation_score, completed_internships, skill_test_score, company_feedback_score, profile_strength_score")
        .eq("user_id", studentId)
        .maybeSingle();

      if (spError) throw spError;

      if (sp) {
        const raw = sp as any;
        setData({
          reputation_score: Number(raw.reputation_score || 0),
          breakdown: {
            internship_score: Math.min((raw.completed_internships || 0) * 10, 40),
            skill_score: Number(raw.skill_test_score || 0),
            feedback_score: Number(raw.company_feedback_score || 0),
            profile_score: Number(raw.profile_strength_score || 0),
          },
        });
      } else {
        setData(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  /**
   * Explicitly trigger a Wroob Score recalculation for the current user.
   * Call this after completing a skill test or finishing an internship —
   * not on every component mount.
   */
  const recalculate = useCallback(async () => {
    const { data: result, error: fnError } = await supabase.functions.invoke("student-reputation", {
      body: { action: "recalculate" },
    });
    if (!fnError && result) {
      setData({
        reputation_score: Number(result.reputation_score || 0),
        breakdown: {
          internship_score: Math.min((result.completed_internships || 0) * 10, 40),
          skill_score: Number(result.skill_test_score || 0),
          feedback_score: Number(result.company_feedback_score || 0),
          profile_score: Number(result.profile_strength_score || 0),
        },
      });
    }
    return { error: fnError };
  }, []);

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  return { data, loading, error, recalculate, refetch: fetchReputation };
}
