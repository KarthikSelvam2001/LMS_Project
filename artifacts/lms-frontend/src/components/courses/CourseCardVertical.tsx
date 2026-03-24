import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseCardVerticalProps {
  course: any;
  enrollment?: any;
  onViewDetails: () => void;
}

export const CourseCardVertical: React.FC<CourseCardVerticalProps> = ({
  course,
  enrollment,
  onViewDetails
}) => {
  const isEnrolled = enrollment && enrollment.status !== "DROPPED";
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      case "DRAFT": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
      case "ARCHIVED": return "bg-gray-500/15 text-gray-700 dark:text-gray-400";
      default: return "";
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col group border-border/60 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 h-full">
      {/* Top Section */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        <img 
          src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop"} 
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className={`border-none font-semibold shadow-sm ${getStatusColor(course.status)}`}>
            {course.status}
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 flex gap-2">
          <Badge variant="secondary" className="font-semibold shadow-sm bg-background/90 backdrop-blur">
            {course.level}
          </Badge>
        </div>
      </div>

      {/* Middle Section */}
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="text-xs text-primary font-bold tracking-wider uppercase mb-2">
          {course.categoryName || "Uncategorized"}
        </div>
        <h3 className="font-display font-bold text-xl leading-tight mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {course.description || "No description provided for this course."}
        </p>

        {/* Progress Section */}
        {isEnrolled && (
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground uppercase tracking-wider">Course Progress</span>
              <span className="text-primary">{enrollment.progress}%</span>
            </div>
            <Progress value={enrollment.progress} className="h-1.5" />
          </div>
        )}

        {/* Trainer Section */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {course.trainerName?.split(' ').map((n:any) => n[0]).join('') || "T"}
          </div>
          <span className="text-sm text-muted-foreground font-medium truncate">
            {course.trainerName || "Unknown Trainer"}
          </span>
        </div>

        {/* Stats Section */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{course.enrollmentCount || 0} Students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>{course.lessonCount || course.moduleCount || 0} Modules</span>
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-0 border-t bg-muted/20">
        <Button 
          variant="ghost" 
          className="w-full h-12 rounded-none hover:bg-primary hover:text-primary-foreground transition-colors group/btn font-bold"
          onClick={onViewDetails}
        >
          View Course Details
          <ArrowRight className="w-4 h-4 ml-2 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
        </Button>
      </CardFooter>
    </Card>
  );
};
