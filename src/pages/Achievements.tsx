import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Trophy, Share2, Scroll, Star, Zap, Book, Target } from 'lucide-react';
import BadgeList from '@/components/achievements/BadgeList';
import Leaderboard from '@/components/achievements/Leaderboard';
import CertificateList from '@/components/achievements/CertificateList';
import { useQuery } from '@tanstack/react-query';
import { fetchUserAchievements, fetchLeaderboard } from '@/lib/api';
import { Badge, UserAchievements, LeaderboardEntry, Certificate } from '@/types/achievements';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MilestoneCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
}

const Achievements: React.FC = () => {
  const { data: userAchievements, isLoading: achievementsLoading, refetch: refetchAchievements } = useQuery<UserAchievements>({
    queryKey: ['userAchievements'],
    queryFn: fetchUserAchievements,
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  useEffect(() => {
    const checkForNewBadges = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: completedCourses } = await supabase
          .from('course_progress')
          .select('course_id, progress_percentage')
          .eq('user_id', user.id)
          .gte('progress_percentage', 100);
          
        // ... rest of the effect remains the same ...
    };

    checkForNewBadges();
  }, [refetchAchievements]);

  // Simplified badge processing
  const typedBadges: Badge[] = (userAchievements?.badges || []).map(badgeData => ({
    id: badgeData.id,
    name: badgeData.name,
    description: badgeData.description,
    imageUrl: badgeData.imageUrl,
    tier: badgeData.tier as 'bronze' | 'silver' | 'gold',
    category: badgeData.category as 'course' | 'achievement' | 'streak' | 'milestone'
  }));

  const typedCertificates: Certificate[] = userAchievements?.certificates || [];

  // ... rest of the component remains the same ...
};

// ... MilestoneCard component remains the same ...

export default Achievements;
