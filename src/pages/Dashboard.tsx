import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from '@tanstack/react-query';
import { fetchUserData, fetchWeeklyProgress } from '@/lib/api';
import OverviewTab from '@/components/dashboard/OverviewTab';
import ProgressTab from '@/components/dashboard/ProgressTab';
import NotificationsTab from '@/components/dashboard/NotificationsTab';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import InstructorDashboard from '@/components/dashboard/InstructorDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import LearningPathFooter from '@/components/dashboard/LearningPathFooter';
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['userData'],
    queryFn: fetchUserData,
  });

  const { data: weeklyProgressData, isLoading: progressLoading } = useQuery({
    queryKey: ['weeklyProgress'],
    queryFn: fetchWeeklyProgress,
  });

  if (userLoading || progressLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
          Welcome back, {userData?.name}!
        </h2>
        <Avatar className="h-12 w-12 ring-2 ring-purple-500 ring-offset-2">
          <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${userData?.name}`} alt={userData?.name} />
          <AvatarFallback>{userData?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
      </div>
      
      <Card className="overflow-hidden shadow-lg">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <CardContent>
            <Suspense fallback={<div>Loading tab content...</div>}>
              <TabsContent value="overview">
                <OverviewTab userData={userData} />
              </TabsContent>
              <TabsContent value="progress">
                <ProgressTab weeklyProgressData={weeklyProgressData} />
              </TabsContent>
              <TabsContent value="notifications">
                <NotificationsTab />
              </TabsContent>
            </Suspense>
          </CardContent>
        </Tabs>
      </Card>

      <Card className="overflow-hidden shadow-lg">
        <CardContent>
          <h3 className="text-xl font-semibold mb-4">Learning Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="progress" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {userData?.role === 'student' && <StudentDashboard />}
      {userData?.role === 'instructor' && <InstructorDashboard />}
      {userData?.role === 'admin' && <AdminDashboard />}

      <LearningPathFooter />
    </div>
  );
};

export default Dashboard;