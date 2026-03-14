import React, { useState } from "react";
import { AppLayout } from "@/components/layout";
import { 
  useGetCourseById, 
  useGetLessons,
  useCreateLesson,
  useDeleteLesson
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Plus, PlayCircle, FileText, CheckCircle, GripVertical, Trash2 } from "lucide-react";

const lessonSchema = z.object({
  title: z.string().min(3, "Title is required"),
  type: z.enum(["VIDEO", "READING", "QUIZ"]),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  duration: z.coerce.number().optional(),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

export default function CourseDetail() {
  const { id } = useParams();
  const courseId = Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: course, isLoading: courseLoading } = useGetCourseById(courseId);
  const { data: lessons, isLoading: lessonsLoading } = useGetLessons({ courseId });

  const createMutation = useCreateLesson({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
        setIsCreateOpen(false);
        toast({ title: "Success", description: "Lesson added successfully" });
        form.reset();
      }
    }
  });

  const deleteMutation = useDeleteLesson({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
        toast({ title: "Success", description: "Lesson deleted" });
      }
    }
  });

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: "", type: "VIDEO", content: "", duration: 10 }
  });

  const onSubmit = (values: LessonFormValues) => {
    // calculate next order index
    const nextOrder = lessons && lessons.length > 0 ? Math.max(...lessons.map(l => l.orderIndex)) + 1 : 1;
    createMutation.mutate({ 
      data: { ...values, courseId, orderIndex: nextOrder } 
    });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "VIDEO": return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case "READING": return <FileText className="w-5 h-5 text-emerald-500" />;
      case "QUIZ": return <CheckCircle className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  if (courseLoading) return <AppLayout><div className="py-12 text-center text-muted-foreground">Loading course details...</div></AppLayout>;
  if (!course) return <AppLayout><div className="py-12 text-center text-red-500">Course not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <Button variant="ghost" className="w-fit pl-0 -ml-2 hover:bg-transparent hover:text-primary transition-colors" onClick={() => setLocation("/courses")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
        </Button>

        <div className="relative rounded-2xl overflow-hidden bg-card border shadow-sm flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 lg:w-1/4 min-h-[200px] relative">
            {/* landing page hero scenic mountain landscape */}
            <img 
              src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop"} 
              alt={course.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="font-semibold">{course.level}</Badge>
              <Badge variant="outline" className="font-semibold">{course.status}</Badge>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-semibold">{course.categoryName}</Badge>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">{course.title}</h1>
            <p className="text-muted-foreground max-w-3xl leading-relaxed">
              {course.description || "No description provided for this course. Add a description to help students understand what they will learn."}
            </p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider mb-1">Instructor</span>
                <span className="font-semibold">{course.instructorName || "Unassigned"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider mb-1">Students</span>
                <span className="font-semibold text-primary">{course.enrollmentCount} Enrolled</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-foreground">Course Curriculum</h2>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Lesson</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lesson Title</FormLabel>
                        <FormControl><Input placeholder="E.g., Introduction to the topic" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lesson Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="VIDEO">Video</SelectItem>
                              <SelectItem value="READING">Reading</SelectItem>
                              <SelectItem value="QUIZ">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="duration" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (mins)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="videoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL (optional)</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Content</FormLabel>
                        <FormControl><Textarea rows={4} placeholder="Lesson content..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter className="mt-6">
                      <Button type="submit" disabled={createMutation.isPending} className="w-full">
                        {createMutation.isPending ? "Adding..." : "Add Lesson"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {lessonsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading curriculum...</div>
            ) : lessons && lessons.length > 0 ? (
              lessons.map((lesson, index) => (
                <Card key={lesson.id} className="border border-border/60 shadow-sm hover:border-primary/40 transition-colors group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground p-1 transition-colors">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="p-2 bg-background rounded-lg border">
                      {getIconForType(lesson.type)}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="font-bold text-foreground text-lg">{lesson.title}</span>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1 font-medium">
                        <span className="uppercase tracking-wider">{lesson.type}</span>
                        {lesson.duration && <span>• {lesson.duration} mins</span>}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => {
                        if(window.confirm("Delete this lesson?")) deleteMutation.mutate({ id: lesson.id });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-16 text-center bg-card border border-dashed rounded-xl flex flex-col items-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">Curriculum is empty</h3>
                <p className="text-muted-foreground mt-1">Add lessons to start building this course.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
