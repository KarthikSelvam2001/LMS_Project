import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Award, Calendar, FileText, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@/lib/custom-fetch";

interface Certificate {
  id: string;
  certificateId: string;
  courseName: string;
  issuedAt: string;
  completionDate: string;
  score: number;
  certificateUrl: string;
}

export default function MyCertificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const data = await customFetch("/api/certificates/my-certificates");
      setCertificates(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not load your certificates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAbsoluteUrl = (path: string) => {
    const baseUrl = (window as any).__LMS_API_BASE_URL__ || "";
    if (!path.startsWith("http") && baseUrl) {
      const b = baseUrl.replace(/\/$/, "");
      const p = path.startsWith("/") ? path : `/${path}`;
      const full = b + p;
      return full.replace(/\/api\/api\//g, "/api/");
    }
    return path;
  };

  const handleDownload = (cert: Certificate) => {
    window.open(getAbsoluteUrl(`/api/certificates/${cert.id}/download`), "_blank");
  };

  const handleView = (cert: Certificate) => {
    window.open(getAbsoluteUrl(`/api/certificates/${cert.id}/view`), "_blank");
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">My Certificates</h1>
          <p className="text-muted-foreground text-lg">Celebrate your achievements and showcase your expertise.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse border-2 border-dashed border-muted-foreground/10" />
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/50 rounded-3xl border-2 border-dashed border-muted-foreground/20 shadow-inner">
            <div className="bg-primary/10 p-6 rounded-full mb-6">
              <Award className="w-16 h-16 text-primary/40" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No certificates yet</h2>
            <p className="text-muted-foreground max-w-sm text-center px-6">
              Complete your courses and pass all quizzes to earn your official recognition.
            </p>
            <Button variant="outline" className="mt-8 rounded-full px-8" onClick={() => window.location.href = "/courses"}>
              Browse Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {certificates.map((cert) => (
              <Card key={cert.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-none bg-gradient-to-br from-card to-muted/30">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Award className="w-24 h-24 text-primary" />
                </div>
                
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <CardDescription className="font-mono text-[10px] tracking-widest uppercase text-primary/70">
                      Official Certification
                    </CardDescription>
                  </div>
                  <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {cert.courseName}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4 pb-8">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Issued on {format(new Date(cert.issuedAt), "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="font-mono text-xs">{cert.certificateId}</span>
                  </div>
                </CardContent>
                
                <CardFooter className="flex gap-3 pt-0 border-t border-muted/50 mt-auto bg-muted/20 backdrop-blur-sm">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 rounded-xl h-10 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                    onClick={() => handleView(cert)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 rounded-xl h-10 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    onClick={() => handleDownload(cert)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
