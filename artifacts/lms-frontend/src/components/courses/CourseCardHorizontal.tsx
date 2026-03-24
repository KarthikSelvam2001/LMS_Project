import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface CourseCardHorizontalProps {
  course: any;
  enrollment?: any;
  onEnroll: () => void;
  onDrop: () => void;
  isEnrolling?: boolean;
}

export const CourseCardHorizontal: React.FC<CourseCardHorizontalProps> = ({
  course,
  enrollment,
  onEnroll,
  onDrop,
  isEnrolling
}) => {
  const isEnrolled = enrollment && enrollment.status !== "DROPPED";
  
  return (
    <Card className="border shadow-md overflow-hidden flex flex-col md:flex-row bg-white relative">
      {/* Left Section: Image */}
      <div className="md:w-[280px] lg:w-[320px] h-48 md:h-auto shrink-0 bg-muted relative">
        <img 
          src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop"} 
          alt={course.title}
          className="w-full h-full object-cover absolute inset-0" 
        />
      </div>

      {/* Right Section: Course Info */}
      <CardContent className="p-6 md:p-8 flex-1 flex flex-col justify-center relative">
        <div className="flex flex-wrap gap-2 mb-4 mt-2">
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {course.level}
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

        {isEnrolled && (
          <div className="space-y-2 mb-8 max-w-sm">
            <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
              <span>Course Progress</span>
              <span>{enrollment.progress || 0}%</span>
            </div>
            <Progress value={enrollment.progress || 0} className="h-2 bg-slate-100" />
          </div>
        )}
        
        <div className="flex items-center gap-10 mt-auto pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trainer</span>
            <span className="font-semibold text-slate-900 text-sm">{course.trainerName || "Unknown"}</span>
          </div>
        </div>

        {/* Buttons Section */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3">
          {isEnrolled ? (
            <>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-4 py-2 font-bold opacity-70">
                Enrolled
              </Badge>
              <Button 
                variant="destructive" 
                onClick={onDrop}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Drop Course
              </Button>
            </>
          ) : (
            <Button 
              onClick={onEnroll}
              disabled={isEnrolling}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20"
            >
              {isEnrolling ? "Enrolling..." : "Enroll"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
