import React, { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useGetEnrollments, useUpdateEnrollmentStatus } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { GraduationCap, Award, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Enrollments() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isLearner = user?.roleId === "LEARNER";

  const { data: enrollments, isLoading } = useGetEnrollments({
    status: statusFilter !== "ALL" ? (statusFilter as any) : undefined
  });

  const updateMutation = useUpdateEnrollmentStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
        toast({ title: "Success", description: "Enrollment status updated" });
      }
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case "COMPLETED": return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "DROPPED": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      default: return "";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Enrollments</h1>
            <p className="text-muted-foreground mt-1">Track student progress and manage course access.</p>
          </div>
        </div>

        <div className="flex bg-card p-4 rounded-xl border shadow-sm w-full md:w-1/3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background w-full">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Enrollments</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="DROPPED">Dropped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Enrolled Date</TableHead>
                {!isLearner && <TableHead className="text-right">Manage Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={isLearner ? 5 : 5} className="text-center py-8">Loading enrollments...</TableCell></TableRow>
              ) : enrollments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isLearner ? 4 : 5} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <GraduationCap className="w-12 h-12 mb-3 opacity-20" />
                      No enrollments found matching the criteria.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                (enrollments as any[])?.map((enrollment: any) => (
                  <TableRow key={enrollment.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{enrollment.userName || "Unknown Student"}</span>
                        <span className="text-xs text-muted-foreground">{enrollment.userEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{enrollment.courseTitle || "Unknown Course"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-semibold tracking-wide text-[10px] uppercase ${getStatusColor(enrollment.status)}`}>
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="w-[70px] bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${enrollment.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground min-w-[30px] text-right">
                          {enrollment.progress || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(enrollment.enrolledAt), "MMM d, yyyy")}
                        </span>
                        {isLearner && enrollment.status === "COMPLETED" && enrollment.certificateId && (
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2 rounded-lg bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                              onClick={() => window.open(`/api/certificates/${enrollment.certificateId}/view`, "_blank")}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Certificate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                              onClick={() => window.open(`/api/certificates/${enrollment.certificateId}/download`, "_blank")}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download Certificate
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {!isLearner && (
                      <TableCell className="text-right">
                        <Select
                          value={enrollment.status}
                          onValueChange={(val) => updateMutation.mutate({ id: enrollment.id, data: { status: val as any } })}
                        >
                          <SelectTrigger className="w-[140px] ml-auto h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Mark Active</SelectItem>
                            <SelectItem value="COMPLETED">Mark Completed</SelectItem>
                            <SelectItem value="DROPPED">Mark Dropped</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
