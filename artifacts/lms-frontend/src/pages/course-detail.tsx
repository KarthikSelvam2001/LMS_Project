import React, { useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  useGetCourseById,
  useGetModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useGetLessons,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useGetQuizByLesson,
  useCreateQuiz,
  useUpdateQuiz,
  useDeleteQuiz,
  useUpdateCourse,
  useDeleteCourse,
  useGetCategories,
  useGetUsers,
  useTrackLessonWatch,
  useGetCourseProgress,
  useGetCourseProgressDetails,
  useCreateQuizAttempt,
  useCreateEnrollment,
  useGetEnrollments,
  useUpdateEnrollmentStatus,
} from "@workspace/api-client-react";
import { CourseCardHorizontal } from "@/components/courses/CourseCardHorizontal";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  ArrowLeft, Plus, PlayCircle, Trash2, ChevronDown, ChevronRight,
  BookOpen, HelpCircle, ExternalLink, ListTodo, X, Check, Pencil,
} from "lucide-react";

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

const moduleSchema = z.object({
  title: z.string().min(2, "Title required"),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
});

const lessonSchema = z.object({
  title: z.string().min(2, "Title required"),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  duration: z.coerce.number().optional(),
  orderIndex: z.number().optional(),
});

const quizQuestionSchema = z.object({
  question: z.string().min(3, "Question required"),
  options: z.array(z.string()).min(2),
  answer: z.string().min(1, "Mark the correct answer"),
});

const quizSchema = z.object({
  title: z.string().min(2, "Title required"),
  questions: z.array(quizQuestionSchema).min(1, "At least 1 question required"),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;
type LessonFormValues = z.infer<typeof lessonSchema>;
type QuizFormValues = z.infer<typeof quizSchema>;

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  if (embedUrl) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Lesson Video"
        />
      </div>
    );
  }
  return (
    <div className="aspect-video w-full rounded-xl bg-muted flex flex-col items-center justify-center gap-3 border-2 border-dashed">
      <ExternalLink className="w-10 h-10 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">Unsupported video format</p>
      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">
        Open video link
      </a>
    </div>
  );
}

function QuizSection({ lessonId }: { lessonId: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isTaking, setIsTaking] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<any>(null);

  const { data: quiz, isLoading } = useGetQuizByLesson({ lessonId });

  const createMutation = useCreateQuiz({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
        setIsEditing(false);
        toast({ title: "Quiz created!" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateQuiz({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
        setIsEditing(false);
        toast({ title: "Quiz updated!" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteQuiz({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
        toast({ title: "Quiz deleted" });
      },
    },
  });

  const attemptMutation = useCreateQuizAttempt({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setIsTaking(false);
        queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
        toast({ title: data.passed ? "Passed!" : "Failed", description: `You scored ${data.score}%` });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    }
  });

  const defaultQuestions = [{ question: "", options: ["", "", "", ""], answer: "" }];

  const quizForm = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: "Lesson Quiz", questions: defaultQuestions },
  });

  const { fields, append, remove } = useFieldArray({ control: quizForm.control, name: "questions" });

  const openEdit = () => {
    const questions = quiz && Array.isArray(quiz.questions) ? quiz.questions : defaultQuestions;
    quizForm.reset({
      title: quiz?.title ?? "Lesson Quiz",
      questions: questions.length > 0 ? (questions as any[]) : defaultQuestions,
    });
    setIsEditing(true);
  };

  const onQuizSubmit = (values: QuizFormValues) => {
    if (quiz) {
      updateMutation.mutate({ id: quiz.id, data: { title: values.title, questions: values.questions } });
    } else {
      createMutation.mutate({ data: { lessonId: String(lessonId), title: values.title, questions: values.questions } });
    }
  };

  const submitAttempt = () => {
    if (!quiz) return;
    const answers = Object.entries(userAnswers).map(([idx, ans]) => ({
      questionIndex: parseInt(idx),
      answer: ans
    }));
    attemptMutation.mutate({ data: { quizId: quiz.id, answers } });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading quiz...</div>;

  const isLearner = user?.roleId === "LEARNER";

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-500" />
          <span className="font-semibold text-sm">Quiz</span>
          {quiz && Array.isArray(quiz.questions) && (
            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
              {quiz.questions.length} questions
            </Badge>
          )}
        </div>
        {!isLearner && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={openEdit} className="h-7 text-xs">
              <Pencil className="w-3 h-3 mr-1" />
              {quiz ? "Edit" : "Create Quiz"}
            </Button>
            {quiz && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => { if (window.confirm("Delete this quiz?")) deleteMutation.mutate({ id: quiz.id }); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {quiz && isLearner && !isTaking && !result && (
        <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100 flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-purple-100 rounded-full">
            <ListTodo className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Test Your Knowledge</h4>
            <p className="text-sm text-slate-500 max-w-[300px] mt-1">Complete this quiz to mark the lesson as finished and earn points.</p>
          </div>
          <Button onClick={() => setIsTaking(true)} className="bg-purple-600 hover:bg-purple-700 shadow-sm">
            Start Quiz
          </Button>
        </div>
      )}

      {result && isLearner && (
        <div className={`p-6 rounded-xl border flex flex-col items-center gap-4 text-center ${result.passed ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
          <div className={`p-3 rounded-full ${result.passed ? "bg-green-100" : "bg-red-100"}`}>
            {result.passed ? <Check className="w-6 h-6 text-green-600" /> : <X className="w-6 h-6 text-red-600" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{result.passed ? "Well Done!" : "Try Again"}</h4>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900">{result.score}%</span>
              <p className="text-sm text-slate-500">
                {result.passed ? "You've successfully passed the quiz." : "You need at least 60% to pass."}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { setResult(null); setIsTaking(true); setUserAnswers({}); }} className="bg-white">
            {result.passed ? "Retake Quiz" : "Try Again"}
          </Button>
        </div>
      )}

      {isTaking && quiz && Array.isArray(quiz.questions) && (
        <div className="space-y-6 bg-white p-6 rounded-xl border shadow-sm">
          {quiz.questions.map((q: any, i: number) => (
            <div key={i} className="space-y-3">
              <p className="font-bold text-slate-800">{i + 1}. {q.question}</p>
              <RadioGroup
                value={userAnswers[i] || ""}
                onValueChange={(val) => setUserAnswers(prev => ({ ...prev, [i]: val }))}
                className="space-y-2"
              >
                {Array.isArray(q.options) && q.options.map((opt: string, j: number) => (
                  <div key={j} className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-transparent has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                    <RadioGroupItem value={opt} id={`q${i}o${j}`} />
                    <Label htmlFor={`q${i}o${j}`} className="flex-1 cursor-pointer text-sm font-medium">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsTaking(false)} className="flex-1">Cancel</Button>
            <Button onClick={submitAttempt} disabled={attemptMutation.isPending} className="flex-1">
              {attemptMutation.isPending ? "Submitting..." : "Submit Answers"}
            </Button>
          </div>
        </div>
      )}

      {quiz && Array.isArray(quiz.questions) && !isEditing && !isLearner && (
        <div className="space-y-2">
          {quiz.questions.map((q: any, i: number) => (
            <div key={i} className="bg-muted/40 rounded-lg p-3 text-sm">
              <p className="font-medium mb-2">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-1">
                {Array.isArray(q.options) && q.options.map((opt: string, j: number) => (
                  <span key={j} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${opt === q.answer ? "bg-green-100 text-green-700 font-medium" : "text-muted-foreground"}`}>
                    {opt === q.answer && <Check className="w-3 h-3 shrink-0" />}{opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trainer's Quiz Editor Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) setIsEditing(false); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{quiz ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
            <DialogDescription>Add questions with multiple choice options and mark the correct answer.</DialogDescription>
          </DialogHeader>
          <Form {...quizForm}>
            <form onSubmit={quizForm.handleSubmit(onQuizSubmit)} className="space-y-4">
              <FormField control={quizForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz Title</FormLabel>
                  <FormControl><Input placeholder="Lesson Quiz" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {fields.map((fieldItem, qi) => (
                <div key={fieldItem.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground text-xs uppercase tracking-wider">Question {qi + 1}</span>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(qi)}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <FormField control={quizForm.control} name={`questions.${qi}.question`} render={({ field }) => (
                    <FormItem>
                      <FormControl><Input placeholder="Enter your question..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Options — click checkmark to set correct answer</p>
                    {[0, 1, 2, 3].map((oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <FormField control={quizForm.control} name={`questions.${qi}.options.${oi}`} render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl><Input placeholder={`Option ${oi + 1}`} {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={quizForm.control} name={`questions.${qi}.answer`} render={({ field }) => {
                          const optionVal = quizForm.watch(`questions.${qi}.options.${oi}`);
                          const isCorrect = field.value === optionVal && Boolean(optionVal);
                          return (
                            <Button
                              type="button"
                              variant={isCorrect ? "default" : "outline"}
                              size="icon"
                              className={`h-9 w-9 shrink-0 ${isCorrect ? "bg-green-600 hover:bg-green-700" : ""}`}
                              onClick={() => field.onChange(optionVal)}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          );
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="w-full h-10 border-dashed"
                onClick={() => append({ question: "", options: ["", "", "", ""], answer: "" })}>
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Question
              </Button>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button variant="ghost" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Quiz"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonPanel({ moduleId, courseId }: { moduleId: any; courseId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedLessonId, setSelectedLessonId] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [deletingLesson, setDeletingLesson] = useState<any>(null);

  const { data: lessons, isLoading } = useGetLessons({ moduleId });
  const { data: progressList } = useGetCourseProgressDetails(courseId as string);

  const isLearner = user?.roleId === "LEARNER";

  const createMutation = useCreateLesson({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
        setIsAddOpen(false);
        toast({ title: "Lesson added!" });
        lessonForm.reset();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateLesson({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
        setEditingLesson(null);
        toast({ title: "Lesson updated!" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteLesson({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
        if (selectedLessonId === vars.id) setSelectedLessonId(null);
        setDeletingLesson(null);
        toast({ title: "Lesson deleted" });
      },
    },
  });

  const trackWatchMutation = useTrackLessonWatch({
      mutation: {
          onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
          }
      }
  });

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: "", description: "", videoUrl: "", duration: 0 },
  });

  const onLessonSubmit = (values: LessonFormValues) => {
    if (editingLesson) {
      updateMutation.mutate({
        id: editingLesson.id,
        data: {
          title: values.title,
          description: values.description || undefined,
          videoUrl: values.videoUrl || undefined,
          duration: values.duration || undefined,
          orderIndex: values.orderIndex,
        },
      });
    } else {
      const nextOrder = lessons && lessons.length > 0
        ? Math.max(...lessons.map((l) => l.orderIndex ?? 0)) + 1
        : 1;
      createMutation.mutate({
        data: {
          title: values.title,
          description: values.description || undefined,
          videoUrl: values.videoUrl || undefined,
          duration: values.duration || undefined,
          moduleId: String(moduleId),
          orderIndex: nextOrder,
        },
      });
    }
  };

  const openEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    lessonForm.reset({
      title: lesson.title,
      description: lesson.description || "",
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration || 0,
      orderIndex: lesson.orderIndex || 0,
    });
  };

  const onSelectLesson = (lesson: any) => {
      const isSelecting = selectedLessonId !== lesson.id;
      setSelectedLessonId(isSelecting ? lesson.id : null);
      
      if (isSelecting && isLearner) {
          trackWatchMutation.mutate({ lessonId: lesson.id });
      }
  };

  const getLessonProgress = (lessonId: string) => {
      return progressList?.find(p => p.lessonId === lessonId);
  };

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Loading lessons...</div>
      ) : lessons && lessons.length > 0 ? (
        <div className="space-y-2">
          {lessons.map((lesson, index) => {
            const progress = getLessonProgress(lesson.id);
            const isCompleted = progress?.status === "COMPLETED";
            
            return (
              <div key={lesson.id}>
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:border-primary/50 group ${selectedLessonId === lesson.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-background border-border/60 hover:shadow-sm"}`}
                  onClick={() => onSelectLesson(lesson)}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold shrink-0 ${isCompleted ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                  </div>
                  <PlayCircle className={`w-4 h-4 shrink-0 ${selectedLessonId === lesson.id ? "text-primary" : "text-slate-400 group-hover:text-primary transition-colors"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${selectedLessonId === lesson.id ? "text-primary" : "text-slate-700"}`}>{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {lesson.duration != null && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {Math.floor(lesson.duration / 60)}m {lesson.duration % 60}s
                          </span>
                        )}
                        {isLearner && progress?.isWatched && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-blue-50 text-blue-600 border-blue-100">Watched</Badge>
                        )}
                        {isLearner && progress?.isQuizPassed && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-purple-50 text-purple-600 border-purple-100">Quiz Passed</Badge>
                        )}
                    </div>
                  </div>
                  
                  {lesson.quiz && !isCompleted && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 shrink-0 h-5">Quiz</Badge>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {!isLearner && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-slate-100"
                          onClick={(e) => { e.stopPropagation(); openEditLesson(lesson); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); setDeletingLesson(lesson); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {selectedLessonId === lesson.id
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground/60" />}
                  </div>
                </div>

                {selectedLessonId === lesson.id && (
                  <div className="ml-9 mt-3 mb-4 rounded-xl border border-border/50 bg-slate-50/30 p-4 space-y-4">
                    {lesson.videoUrl ? (
                      <VideoPlayer videoUrl={lesson.videoUrl} />
                    ) : (
                      <div className="aspect-video rounded-xl bg-muted/30 flex flex-col items-center justify-center gap-2 border border-dashed">
                        <PlayCircle className="w-10 h-10 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground">No video available</p>
                      </div>
                    )}
                    {lesson.description && (
                      <div className="bg-white/80 p-3 rounded-lg border border-border/40">
                        <p className="text-sm text-slate-600 leading-relaxed font-medium mb-1">Lesson Description</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{lesson.description}</p>
                      </div>
                    )}
                    <QuizSection lessonId={lesson.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl bg-slate-50/50">
          No lessons found in this module.
        </div>
      )}

      {!isLearner && (
        <Button size="sm" variant="outline" className="w-full mt-4 h-10 border-dashed hover:border-primary/50 hover:bg-primary/5 group" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-2 text-muted-foreground group-hover:text-primary transition-colors" /> 
          <span className="group-hover:text-primary transition-colors">Add Lesson</span>
        </Button>
      )}

      <Dialog open={isAddOpen || editingLesson !== null} onOpenChange={(val) => { if (!val) { setIsAddOpen(false); setEditingLesson(null); } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
            <DialogDescription>{editingLesson ? "Update video lesson details." : "Add a video lesson to this module."}</DialogDescription>
          </DialogHeader>
          <Form {...lessonForm}>
            <form onSubmit={lessonForm.handleSubmit(onLessonSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={lessonForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Introduction to Variables" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={lessonForm.control} name="orderIndex" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={lessonForm.control} name="videoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Video URL</FormLabel>
                  <FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={lessonForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea placeholder="What will learners gain?" className="resize-none" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={lessonForm.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (seconds)</FormLabel>
                  <FormControl><Input type="number" placeholder="600" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => { setIsAddOpen(false); setEditingLesson(null); }}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingLesson ? "Save Changes" : "Add Lesson")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Warning Dialog */}
      <Dialog open={deletingLesson !== null} onOpenChange={(val) => { if (!val) setDeletingLesson(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Warning: Delete Lesson
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 rounded-lg border">
              <p className="font-bold text-slate-800 mb-1">{deletingLesson?.title}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{deletingLesson?.description}</p>
            </div>
            <p className="text-sm text-slate-600 font-medium">Are you sure you want to delete this lesson?</p>
            <p className="text-[11px] text-slate-400">This will remove the lesson and its associated quiz from the curriculum.</p>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setDeletingLesson(null)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: deletingLesson?.id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const courseId = id || ""; // Use string ID for MongoDB
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [openModules, setOpenModules] = useState<Set<any>>(new Set());
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [deletingModule, setDeletingModule] = useState<any>(null);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [isDeleteCourseOpen, setIsDeleteCourseOpen] = useState(false);
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);

  // Fetch categories and trainers for course edit form
  const { data: categories } = useGetCategories();
  const { data: trainersData } = useGetUsers({ role: "TRAINER" as any });
  const trainers = trainersData?.users;

  const isLearner = user?.roleId === "LEARNER";

  const courseForm = useForm<any>({
    resolver: zodResolver(z.object({
      title: z.string().min(2, "Title required"),
      description: z.string().optional(),
      level: z.string().optional(),
      status: z.string().optional(),
      categoryId: z.string().optional(),
      trainerId: z.string().optional(),
    })),
    defaultValues: {
      title: "",
      description: "",
      level: "BEGINNER",
      status: "DRAFT",
      categoryId: "",
      trainerId: "",
    },
  });

  // Cast courseId to any to bypass the old generated React Query types that still expect numbers
  const { data: course, isLoading: courseLoading } = useGetCourseById(courseId as any);
  const { data: modules, isLoading: modulesLoading } = useGetModules(
    { courseId: courseId as any },
    { query: { enabled: !!courseId } } as any
  );
  const { data: progressSummary } = useGetCourseProgress(courseId as string, {
      query: { enabled: isLearner && !!courseId }
  });

  const { data: enrollments } = useGetEnrollments({
    userId: user?.id as any,
    courseId: courseId as any
  });

  const enrollment = (enrollments as any[])?.find(e => String(e.courseId?._id || e.courseId) === String(courseId));
  const isEnrolled = enrollment && enrollment.status !== "DROPPED";

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

  const calculateOverallProgress = () => {
      return progressSummary?.completionPercentage || 0;
  };

  const deleteCourseMutation = useDeleteCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Course deleted successfully!" });
        setLocation("/courses");
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete course", description: err.message, variant: "destructive" });
      }
    }
  });

  const createModuleMutation = useCreateModule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
        setIsAddModuleOpen(false);
        toast({ title: "Module added!" });
        moduleForm.reset();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const updateCourseMutation = useUpdateCourse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
        setIsEditCourseOpen(false);
        toast({ title: "Course updated successfully!" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const deleteModuleMutation = useDeleteModule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
        setDeletingModule(null);
        toast({ title: "Module deleted" });
      },
    },
  });

  const updateModuleMutation = useUpdateModule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
        setEditingModule(null);
        toast({ title: "Module updated!" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const moduleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: "", description: "" },
  });

  const onModuleSubmit = (values: ModuleFormValues) => {
    if (editingModule) {
      updateModuleMutation.mutate({
        id: editingModule.id,
        data: { 
          title: values.title, 
          description: values.description || undefined,
          orderIndex: values.orderIndex
        },
      });
    } else {
      const nextOrder = modules && modules.length > 0
        ? Math.max(...modules.map((m) => m.orderIndex ?? 0)) + 1
        : 1;
      createModuleMutation.mutate({
        data: { courseId, title: values.title, description: values.description || undefined, orderIndex: nextOrder },
      });
    }
  };

  const openEditModule = (mod: any) => {
    setEditingModule(mod);
    moduleForm.reset({
      title: mod.title,
      description: mod.description || "",
      orderIndex: mod.orderIndex || 0,
    });
  };

  const onCourseSubmit = (values: any) => {
    // Convert "none" sentinel values back to undefined for the API
    const data = {
      ...values,
      categoryId: values.categoryId === "none" ? undefined : values.categoryId,
      trainerId: values.trainerId === "none" ? undefined : values.trainerId,
    };
    
    updateCourseMutation.mutate({
      id: courseId as any,
      data,
    });
  };

  const openEditCourse = () => {
    if (!course) return;
    
    // Safely extract IDs if they were populated as objects by the backend
    const catId = typeof course.categoryId === 'object' && course.categoryId !== null 
      ? (course.categoryId as any).id || (course.categoryId as any)._id 
      : course.categoryId;
      
    const trainId = typeof course.trainerId === 'object' && course.trainerId !== null
      ? (course.trainerId as any).id || (course.trainerId as any)._id
      : course.trainerId;

    courseForm.reset({
      title: course.title,
      description: course.description || "",
      level: course.level,
      status: course.status,
      categoryId: catId || "none",
      trainerId: trainId || "none",
    });
    setIsEditCourseOpen(true);
  };

  const toggleModule = (id: any) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (courseLoading) {
    return <AppLayout><div className="py-12 text-center text-muted-foreground">Loading course...</div></AppLayout>;
  }
  if (!course) {
    return <AppLayout><div className="py-12 text-center text-red-500">Course not found</div></AppLayout>;
  }

  const statusColors: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-700 border-green-200",
    DRAFT: "bg-yellow-100 text-yellow-700 border-yellow-200",
    ARCHIVED: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const overallProgress = calculateOverallProgress();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <Button
          variant="ghost"
          className="w-fit pl-0 -ml-2 hover:bg-transparent hover:text-primary"
          onClick={() => setLocation("/courses")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Courses
        </Button>
        {/* Course Overview Redesigned */}
        {/* Course Overview */}
        {isLearner ? (
          <CourseCardHorizontal 
            course={course}
            enrollment={enrollment}
            onEnroll={() => enrollMutation.mutate({ data: { courseId } as any })}
            onDrop={() => setDropConfirmOpen(true)}
            isEnrolling={enrollMutation.isPending}
          />
        ) : (
          <Card className="border shadow-md overflow-hidden flex flex-col md:flex-row bg-white relative">
            <div className="md:w-[280px] lg:w-[320px] h-48 md:h-auto shrink-0 bg-muted relative">
              <img 
                src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop"} 
                alt={course.title}
                className="w-full h-full object-cover absolute inset-0" 
              />
            </div>
            <CardContent className="p-6 md:p-8 flex-1 flex flex-col justify-center relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary bg-white border shadow-sm" onClick={openEditCourse}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-white border shadow-sm" onClick={() => setIsDeleteCourseOpen(true)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 mt-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {course.level}
                </Badge>
                <Badge variant="outline" className={`border border-current rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[course.status] ?? "text-slate-700"}`}>
                  {course.status}
                </Badge>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {course.categoryName || "Uncategorized"}
                </Badge>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-3 pr-20">{course.title}</h1>
              
              {course.description && (
                <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-3xl mb-6">
                  {course.description}
                </p>
              )}
              
              <div className="flex items-center gap-10 mt-auto pt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trainer</span>
                  <span className="font-semibold text-slate-900 text-sm">{course.trainerName || "Unknown"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Students</span>
                  <span className="font-bold text-blue-600 text-sm">{course.enrollmentCount ?? 0} Enrolled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Drop Confirmation Dialog */}
        <AlertDialog open={dropConfirmOpen} onOpenChange={setDropConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Drop Course</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to drop this course?
                <br /><br />
                Your progress will be preserved, but you will need to re-enroll to continue learning.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => enrollment && dropMutation.mutate({ id: enrollment.id, data: { status: "DROPPED" } })}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Drop Course
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Course Curriculum</h2>
              {modules && (
                <Badge variant="outline" className="text-xs">{modules.length} modules</Badge>
              )}
            </div>
            {!isLearner && (
              <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add Module
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add Module</DialogTitle>
                    <DialogDescription>Modules group related lessons together in the curriculum.</DialogDescription>
                  </DialogHeader>
                  <Form {...moduleForm}>
                    <form onSubmit={moduleForm.handleSubmit(onModuleSubmit)} className="space-y-3">
                      <FormField control={moduleForm.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Module Title</FormLabel>
                          <FormControl><Input placeholder="e.g. Getting Started" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={moduleForm.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (optional)</FormLabel>
                          <FormControl><Textarea placeholder="What will this module cover?" rows={2} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsAddModuleOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createModuleMutation.isPending}>
                          {createModuleMutation.isPending ? "Adding..." : "Add Module"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {modulesLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading curriculum...</div>
          ) : modules && modules.length > 0 ? (
            <div className="space-y-3">
              {modules.map((mod, idx) => (
                <Card key={mod.id} className="border shadow-sm">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <button
                        className="flex-1 flex items-center gap-2 text-left hover:text-primary transition-colors min-w-0"
                        onClick={() => toggleModule(mod.id)}
                      >
                        <span className="font-semibold truncate">{mod.title}</span>
                        {mod.description && (
                          <span className="text-xs text-muted-foreground hidden md:inline truncate">— {mod.description}</span>
                        )}
                        <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{mod.lessonCount ?? (mod as any).lessons?.length ?? 0} lessons</Badge>
                        {openModules.has(mod.id)
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </button>
                      {!isLearner && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-slate-50"
                            onClick={() => openEditModule(mod)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingModule(mod)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {openModules.has(mod.id) && (
                    <CardContent className="px-4 pb-4 pt-0 border-t">
                      <div className="pt-3">
                        <LessonPanel moduleId={mod.id} courseId={courseId} />
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-card border border-dashed rounded-xl flex flex-col items-center gap-3">
              <ListTodo className="w-12 h-12 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold">No modules yet</h3>
              <p className="text-muted-foreground text-sm">{isLearner ? "Curriculum is not yet available for this course." : "Add a module to start building the curriculum."}</p>
              {!isLearner && (
                <Button size="sm" onClick={() => setIsAddModuleOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add First Module
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Edit Course Dialog */}
        <Dialog open={isEditCourseOpen} onOpenChange={setIsEditCourseOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
              <DialogDescription>Update your course details and settings.</DialogDescription>
            </DialogHeader>
            <Form {...courseForm}>
              <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="space-y-4">
                <FormField control={courseForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={courseForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={courseForm.control} name="level" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-transparent"><SelectValue placeholder="Level" /></SelectTrigger>
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
                  <FormField control={courseForm.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-transparent"><SelectValue placeholder="Status" /></SelectTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={courseForm.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={courseForm.control} name="trainerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trainer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select Trainer" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {trainers?.map(t => (
                            <SelectItem key={t.id} value={t.id}>{`${t.firstName} ${t.lastName}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsEditCourseOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateCourseMutation.isPending}>
                    {updateCourseMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Soft Delete Course Warning Dialog */}
        <Dialog open={isDeleteCourseOpen} onOpenChange={setIsDeleteCourseOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Warning: Delete Course
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="font-bold text-slate-800 mb-1">{course?.title}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{course?.description}</p>
              </div>
              <p className="text-sm text-slate-600 font-medium">Are you sure you want to delete this course?</p>
              <p className="text-[11px] text-slate-400">This will hide the course and its curriculum from all learners. You can restore it later if needed.</p>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setIsDeleteCourseOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                disabled={deleteCourseMutation.isPending}
                onClick={() => deleteCourseMutation.mutate({ id: courseId as any })}
              >
                {deleteCourseMutation.isPending ? "Deleting..." : "Delete Course"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reusing Add Module Dialog for Editing */}
        <Dialog open={editingModule !== null} onOpenChange={(val) => { if (!val) setEditingModule(null); }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Edit Module</DialogTitle>
              <DialogDescription>Update your module grouping curriculum.</DialogDescription>
            </DialogHeader>
            <Form {...moduleForm}>
              <form onSubmit={moduleForm.handleSubmit(onModuleSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={moduleForm.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module Title</FormLabel>
                      <FormControl><Input placeholder="e.g. Getting Started" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={moduleForm.control} name="orderIndex" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={moduleForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl><Textarea placeholder="What will this module cover?" rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setEditingModule(null)}>Cancel</Button>
                  <Button type="submit" disabled={updateModuleMutation.isPending}>
                    {updateModuleMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Module Warning Dialog */}
        <Dialog open={deletingModule !== null} onOpenChange={(val) => { if (!val) setDeletingModule(null); }}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Warning: Delete Module
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="font-bold text-slate-800 mb-1">{deletingModule?.title}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{deletingModule?.description}</p>
              </div>
              <p className="text-sm text-slate-600 font-medium">Are you sure you want to delete this module and all its lessons?</p>
              <p className="text-[11px] text-slate-400">This action cannot be undone and will affect all lessons grouped under this module.</p>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setDeletingModule(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                disabled={deleteModuleMutation.isPending}
                onClick={() => deleteModuleMutation.mutate({ id: deletingModule?.id })}
              >
                {deleteModuleMutation.isPending ? "Deleting..." : "Delete Module"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

