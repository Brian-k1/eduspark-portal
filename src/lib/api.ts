
import { supabase } from '@/integrations/supabase/client';
import { Badge, Certificate, LeaderboardEntry, UserAchievements } from '@/types/achievements';

export const fetchUserData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: courseProgress } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id);

  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', user.id);

  // Since 'role' doesn't exist in profiles table, we'll handle it through user metadata
  const userRole = user.user_metadata?.role || 'student';

  return {
    name: profile?.full_name || user.email?.split('@')[0] || 'User',
    role: userRole as 'student' | 'instructor' | 'admin',
    learningStreak: calculateStreak(courseProgress || []),
    xpGained: calculateXP(courseProgress || []),
    goalsCompleted: (courseProgress || []).filter(p => p.completed).length,
    achievements: (userBadges || []).length,
  };
};

const calculateStreak = (progress: any[]) => {
  return progress.length > 0 ? Math.min(progress.length, 30) : 0;
};

const calculateXP = (progress: any[]) => {
  return progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0);
};

export const fetchWeeklyProgress = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { data: progress } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id);

  return Array.from({ length: 7 }, (_, i) => ({
    week: `Week ${i + 1}`,
    progress: progress ? 
      progress.filter(p => isWithinLastWeek(p.last_accessed, i))
        .reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / progress.length : 0
  }));
};

const isWithinLastWeek = (date: string, weekIndex: number) => {
  const now = new Date();
  const then = new Date(date);
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - then.getTime() <= weekInMs * (weekIndex + 1);
};

export const fetchCourses = async () => {
  const { data: courses } = await supabase
    .from('courses')
    .select('*');

  return courses || [];
};

export const fetchUserAchievements = async (): Promise<UserAchievements> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', user.id);

  const { data: certificates } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', user.id);

  const { data: progress } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id);

  const badges: Badge[] = (userBadges || []).map(ub => {
    // Ensure tier is one of the allowed values
    const tier = ub.badges.tier.toLowerCase();
    const validTier = ['bronze', 'silver', 'gold'].includes(tier) ? tier as 'bronze' | 'silver' | 'gold' : 'bronze';

    // Ensure category is one of the allowed values
    const category = ub.badges.category.toLowerCase();
    const validCategory = ['course', 'achievement', 'streak', 'milestone'].includes(category) 
      ? category as 'course' | 'achievement' | 'streak' | 'milestone'
      : 'achievement';

    return {
      id: ub.badges.id,
      name: ub.badges.name,
      description: ub.badges.description || '',
      imageUrl: ub.badges.image_url || '',
      tier: validTier,
      category: validCategory
    };
  });

  const formattedCertificates: Certificate[] = (certificates || []).map(cert => ({
    id: cert.id,
    name: cert.name,
    description: cert.description || '',
    earnedDate: cert.earned_date,
    downloadUrl: cert.download_url || ''
  }));

  return {
    badges,
    certificates: formattedCertificates,
    coursesCompleted: (progress || []).filter(p => p.completed).length,
    streakDays: calculateStreak(progress || []),
    totalPoints: calculateXP(progress || []),
    contributions: 0
  };
};

export const fetchDiscussionTopics = async () => {
  const { data: discussions } = await supabase
    .from('forum_discussions')
    .select(`
      *,
      profiles:user_id(username, avatar_url),
      replies:forum_replies(count)
    `)
    .order('created_at', { ascending: false });

  return discussions || [];
};

export const fetchUpcomingEvents = async () => {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('start_date', new Date().toISOString())
    .order('start_date');

  return events || [];
};

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const { data: leaderboard } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      user_badges(count),
      course_progress(progress_percentage)
    `)
    .limit(10);

  return (leaderboard || []).map(user => ({
    userId: user.id,
    username: user.username || 'Anonymous',
    badgeCount: user.user_badges?.[0]?.count || 0,
    points: user.course_progress?.reduce((sum: number, p: any) => sum + (p.progress_percentage || 0), 0) || 0
  }));
};

export const createForumPost = async (title: string, content: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { data, error } = await supabase
    .from('forum_discussions')
    .insert([
      { title, content, user_id: user.id }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const joinEvent = async (eventId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { error } = await supabase
    .from('event_participants')
    .insert([
      { event_id: eventId, user_id: user.id }
    ]);

  if (error) throw error;
};

export const updateCourseProgress = async (courseId: string, progress: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { error } = await supabase
    .from('course_progress')
    .upsert([
      {
        user_id: user.id,
        course_id: courseId,
        progress_percentage: progress,
        completed: progress === 100,
        last_accessed: new Date().toISOString()
      }
    ]);

  if (error) throw error;
};

// Enable realtime subscriptions for relevant tables
supabase
  .channel('public:forum_discussions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_discussions' }, payload => {
    console.log('Forum discussion change received!', payload);
  })
  .subscribe();

supabase
  .channel('public:events')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
    console.log('Event change received!', payload);
  })
  .subscribe();
