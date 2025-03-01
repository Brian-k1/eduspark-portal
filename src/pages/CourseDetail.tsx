
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { fetchCourseById, updateCourseProgress } from '@/lib/api';
import CourseHeader from '@/components/course/CourseHeader';
import CourseProgress from '@/components/course/CourseProgress';
import CourseTabs from '@/components/course/CourseTabs';

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [activeTab, setActiveTab] = useState('materials');
  const [userProgress, setUserProgress] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasCompletedCourse, setHasCompletedCourse] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourseById(courseId || ''),
    enabled: !!courseId,
  });

  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['courseProgress', courseId],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !courseId) return null;
        
        const { data, error } = await supabase
          .from('course_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();
          
        if (error) {
          if (error.code !== 'PGRST116') { // Not found error
            console.error("Error fetching course progress:", error);
          }
          return null;
        }
        
        return data;
      } catch (e) {
        console.error("Exception in course progress query:", e);
        return null;
      }
    },
    enabled: !!courseId,
  });

  const { data: certificate } = useQuery({
    queryKey: ['certificate', courseId],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !courseId) return null;
        
        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();
          
        if (error) {
          if (error.code !== 'PGRST116') { // Not found error
            console.error("Error fetching certificate:", error);
          }
          return null;
        }
        
        return data;
      } catch (e) {
        console.error("Exception in certificate query:", e);
        return null;
      }
    },
    enabled: !!courseId,
  });

  useEffect(() => {
    if (progress) {
      setUserProgress(progress.progress_percentage);
      setIsEnrolled(true);
      setHasCompletedCourse(progress.completed);
      if (progress.current_lesson_index !== undefined && progress.current_lesson_index !== null) {
        setCurrentLessonIndex(progress.current_lesson_index);
      }
    }

    if (certificate) {
      setHasCertificate(true);
    }
  }, [progress, certificate]);

  const handleEnroll = async () => {
    try {
      if (!courseId) return;
      
      const result = await updateCourseProgress(courseId, 0);
      console.log("Enrollment result:", result);
      toast.success("Successfully enrolled in the course!");
      setIsEnrolled(true);
      refetchProgress();
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error("Failed to enroll in the course. Please try again.");
    }
  };

  const handleLessonComplete = async (lessonIndex: number) => {
    try {
      if (!courseId || !course) return;
      
      const totalLessons = course.lessons_count;
      const newProgress = Math.min(Math.round(((lessonIndex + 1) / totalLessons) * 100), 100);
      
      await updateCourseProgress(courseId, newProgress, lessonIndex);
      setUserProgress(newProgress);
      
      if (newProgress === 100) {
        setHasCompletedCourse(true);
        toast.success("Congratulations! You've completed the course!");
      } else {
        toast.success("Lesson completed!");
      }
      refetchProgress();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error("Failed to update progress. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-lg">Loading course...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <p className="text-lg text-red-500">Error loading course. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      <CourseHeader course={course} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CourseTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            courseId={courseId || ''}
            courseName={course.title}
            field={course.field}
            level={course.level}
            hasCompletedCourse={hasCompletedCourse}
            currentLessonIndex={currentLessonIndex}
            setCurrentLessonIndex={setCurrentLessonIndex}
            onLessonComplete={handleLessonComplete}
            userProgress={userProgress}
            certificateDate={certificate?.earned_date || new Date().toISOString()}
          />
        </div>
        
        <div className="lg:col-span-1">
          <CourseProgress
            isEnrolled={isEnrolled}
            userProgress={userProgress}
            hasCompletedCourse={hasCompletedCourse}
            hasCertificate={hasCertificate}
            onEnroll={handleEnroll}
            onViewCertificate={() => setActiveTab('certificate')}
            onContinueLearning={() => setActiveTab('materials')}
          />
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
