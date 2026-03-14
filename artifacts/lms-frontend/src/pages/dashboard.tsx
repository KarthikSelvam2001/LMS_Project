import React from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetDashboardStats, 
  useGetRecentEnrollments, 
  useGetPopularCourses 
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, GraduationCap, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentEnrollments();
  const { data: popular, isLoading: popularLoading } = useGetPopularCourses();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "COMPLETED": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "DROPPED": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "PUBLISHED": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "DRAFT": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1 text-lg">Welcome back. Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalStudents} students • {stats?.totalInstructors} instructors
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle>
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalCourses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.publishedCourses} published • {stats?.totalCategories} categories
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Enrollments</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <GraduationCap className="w-5 h-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalEnrollments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.activeEnrollments} active • {stats?.completedEnrollments} completed
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Lessons</CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalLessons}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Enrollments */}
          <Card className="flex flex-col border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent Enrollments</CardTitle>
              <CardDescription>The latest student activity</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {recentLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : recent && recent.length > 0 ? (
                <div className="space-y-4">
                  {recent.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm">{item.userName}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.courseTitle}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={`text-[10px] font-semibold border-0 ${getStatusColor(item.status)}`}>
                          {item.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(item.enrolledAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl">No recent enrollments</div>
              )}
            </CardContent>
          </Card>

          {/* Popular Courses */}
          <Card className="flex flex-col border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Popular Courses</CardTitle>
              <CardDescription>Most enrolled courses currently</CardDescription>
            </CardHeader>
            <CardContent>
              {popularLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : popular && popular.length > 0 ? (
                <div className="space-y-4">
                  {popular.map((course) => (
                    <div key={course.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/40 hover:shadow-sm transition-all hover:border-border">
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{course.title}</span>
                          <Badge variant="secondary" className="text-[10px] h-5">{course.level}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{course.categoryName} • by {course.instructorName}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-primary">{course.enrollmentCount}</span>
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Students</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl">No popular courses yet</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
