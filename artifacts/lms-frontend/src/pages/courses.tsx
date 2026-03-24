import React, { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetCourses, 
  useCreateCourse, 
  useGetCategories,
  useGetUsers,
  useGetEnrollments,
  useCreateEnrollment
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, Plus, BookOpen, Clock, Users, ArrowRight, LogOut, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { 
  useUpdateEnrollmentStatus 
} from "@workspace/api-client-react";
import { CourseFilters } from "@/components/courses/CourseFilters";
import { CourseCardVertical } from "@/components/courses/CourseCardVertical";
import { GraduationCap } from "lucide-react";
import { customFetch } from "@/lib/custom-fetch";

const courseSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  categoryId: z.string().optional(),
  trainerId: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function Courses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("explore");
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const [courseToDrop, setCourseToDrop] = useState<{id: string, enrollmentId: string} | null>(null);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories } = useGetCategories();
  const { data: trainersData } = useGetUsers({ role: "TRAINER" as any });
  const trainers = trainersData?.users;
  
  const { data: enrollments } = useGetEnrollments({
    userId: user?.id
  });

  const { data, isLoading } = useGetCourses({ 
    search: activeTab === "explore" ? (search || undefined) : undefined,
    status: activeTab === "explore" && statusFilter !== "ALL" ? (statusFilter as any) : undefined,
    level: activeTab === "explore" && levelFilter !== "ALL" ? (levelFilter as any) : undefined,
    page: 1, 
    limit: 100 
  });

  const { data: myCoursesEnrollments, isLoading: myCoursesLoading } = useQuery({
    queryKey: ["/api/enrollments/my-courses"],
    queryFn: () => customFetch<any[]>("/api/enrollments/my-courses"),
    enabled: user?.roleId === "LEARNER" && activeTab === "my-courses"
  });

  const enrollMutation = useCreateEnrollment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
        toast({ title: "Enrolled!", description: "You have successfully enrolled in the course." });
      }
    }
  });

  const dropMutation = useUpdateEnrollmentStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
        setDropConfirmOpen(false);
        toast({ title: "Dropped", description: "You have dropped the course." });
      }
    }
  });

  const createMutation = useCreateCourse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
        setIsCreateOpen(false);
        toast({ title: "Success", description: "Course created successfully" });
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to create course", variant: "destructive" });
      }
    }
  });

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { title: "", description: "", status: "DRAFT", level: "BEGINNER" }
  });

  const onSubmit = (values: CourseFormValues) => {
    createMutation.mutate({ data: values });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      case "DRAFT": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
      case "ARCHIVED": return "bg-gray-500/15 text-gray-700 dark:text-gray-400";
      default: return "";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {user?.roleId === "LEARNER" ? "Course Learning" : "Course Catalog"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.roleId === "LEARNER" ? "Explore new skills or continue your learning journey." : "Create, edit, and publish learning materials."}
            </p>
          </div>
          {user?.roleId !== "LEARNER" && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:-translate-y-0.5 rounded-full px-6">
                  <Plus className="w-4 h-4 mr-2" /> New Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>Setup a new course shell. You can add lessons later.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title</FormLabel>
                        <FormControl><Input placeholder="E.g., Intro to Advanced React" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="trainerId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign Trainer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Trainer" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {trainers?.map(t => (
                              <SelectItem key={t.id} value={t.id}>{`${t.firstName} ${t.lastName}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="level" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="BEGINNER">Beginner</SelectItem>
                              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                              <SelectItem value="ADVANCED">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                              <SelectItem value="PUBLISHED">Published</SelectItem>
                              <SelectItem value="ARCHIVED">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="submit" disabled={createMutation.isPending} className="w-full">
                        {createMutation.isPending ? "Creating..." : "Create Course Shell"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {user?.roleId === "LEARNER" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8 p-1 bg-muted/50 rounded-full h-12 w-fit">
              <TabsTrigger value="explore" className="rounded-full px-8 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Explore Courses
              </TabsTrigger>
              <TabsTrigger value="my-courses" className="rounded-full px-8 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                My Courses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="explore" className="space-y-8">
              <CourseFilters 
                searchValue={search}
                statusValue={statusFilter}
                levelValue={levelFilter}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onLevelChange={setLevelFilter}
              />
              {isLoading ? (
                <div className="text-center py-12">Loading courses...</div>
              ) : data?.courses.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data?.courses.map((course: any) => (
                    <CourseCardVertical 
                      key={course.id} 
                      course={course} 
                      enrollment={enrollments?.find(e => String(e.courseId?._id || e.courseId) === String(course.id))}
                      onViewDetails={() => setLocation(`/courses/${course.id}`)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-courses" className="space-y-8">
              <CourseFilters 
                searchValue={search}
                statusValue={statusFilter}
                levelValue={levelFilter}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onLevelChange={setLevelFilter}
              />
              {myCoursesLoading ? (
                <div className="text-center py-12">Loading your courses...</div>
              ) : getFilteredMyCourses().length === 0 ? (
                <div className="text-center py-24 bg-card border border-dashed rounded-xl flex flex-col items-center">
                  <GraduationCap className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold">No courses found</h3>
                  <p className="text-muted-foreground mt-1">Try adjusting your filters or explore the catalog.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab("explore")}>Explore Catalog</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredMyCourses().map((enrollment: any) => (
                    <CourseCardVertical 
                      key={enrollment.id} 
                      course={enrollment.courseId} 
                      enrollment={enrollment}
                      onViewDetails={() => setLocation(`/courses/${enrollment.courseId?._id || enrollment.courseId}`)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <CourseFilters 
                searchValue={search}
                statusValue={statusFilter}
                levelValue={levelFilter}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onLevelChange={setLevelFilter}
            />
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading courses...</div>
            ) : data?.courses.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.courses.map((course: any) => (
                    <CourseCardVertical 
                        key={course.id} 
                        course={course} 
                        enrollment={enrollments?.find(e => String(e.courseId?._id || e.courseId) === String(course.id))}
                        onViewDetails={() => setLocation(`/courses/${course.id}`)}
                    />
                ))}
              </div>
            )}
          </>
        )}

        {/* Drop Confirmation Dialog */}
        <AlertDialog open={dropConfirmOpen} onOpenChange={setDropConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to drop this course?</AlertDialogTitle>
              <AlertDialogDescription>
                Your progress will be preserved, but you will need to re-enroll to continue learning.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => courseToDrop && dropMutation.mutate({ id: courseToDrop.enrollmentId, data: { status: "DROPPED" } })}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Drop Course
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );

  function getFilteredMyCourses() {
    if (!myCoursesEnrollments) return [];
    
    return myCoursesEnrollments.filter((e: any) => {
      const course = e.courseId;
      const titleMatch = !search || course?.title?.toLowerCase().includes(search.toLowerCase());
      const descMatch = !search || course?.description?.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === "ALL" || e.status === statusFilter;
      const levelMatch = levelFilter === "ALL" || course?.level === levelFilter;
      
      return (titleMatch || descMatch) && statusMatch && levelMatch;
    });
  }
}
