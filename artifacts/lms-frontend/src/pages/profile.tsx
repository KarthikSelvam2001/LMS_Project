import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, User, Mail, ShieldCheck, Save } from "lucide-react";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [picture, setPicture] = useState(user?.picture || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!user) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setPicture(base64);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, picture }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }

      await refreshUser();
      toast({ title: "Profile updated", description: "Your changes have been saved successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700 border-red-200",
    TRAINER: "bg-blue-100 text-blue-700 border-blue-200",
    LEARNER: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your identity and how others see you on the platform.</p>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1 bg-muted rounded">Last sync: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Col: Avatar & Badge */}
          <div className="space-y-6">
            <Card className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
              <CardContent className="pt-10 pb-8 text-center bg-gradient-to-b from-primary/5 to-transparent">
                <div className="relative inline-block group">
                  <Avatar className="w-32 h-32 border-4 border-background shadow-xl scale-100 group-hover:scale-[1.02] transition-transform">
                    <AvatarImage src={picture} alt={user.fullName} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 ring-2 ring-background"
                    title="Change profile picture"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </div>
                
                <div className="mt-6 space-y-2">
                  <h3 className="font-bold text-xl tracking-tight">{firstName} {lastName}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-tighter border ${roleColors[user.roleId] || ""}`}>
                      <ShieldCheck className="w-3 h-3 mr-1.5" />
                      {user.roleId}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t py-4 justify-center">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Status</p>
                    <p className="text-xs font-bold text-emerald-600">Active</p>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Member since</p>
                    <p className="text-xs font-bold text-foreground">{new Date(user.createdAt).getFullYear()}</p>
                  </div>
                </div>
              </CardFooter>
            </Card>
            
            <Card className="border-border/50 bg-primary/5 border-primary/10 shadow-none">
              <CardContent className="pt-6">
                 <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                     <Save className="w-4 h-4 text-primary" />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-primary uppercase tracking-tight">Pro Tip</p>
                     <p className="text-[11px] text-primary/80 leading-relaxed mt-1 italic">
                       Professional profile pictures help instructors and classmates identify you easily in courses and discussions.
                     </p>
                   </div>
                 </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Details Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Personal Information</CardTitle>
                <CardDescription>Update your name and profile details below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="firstName" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 px-1">First Name</Label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="firstName" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        className="pl-11 rounded-xl border-border/60 focus-visible:ring-primary/20 focus-visible:border-primary h-12 text-sm font-medium transition-all"
                        placeholder="Your first name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="lastName" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 px-1">Last Name</Label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="lastName" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        className="pl-11 rounded-xl border-border/60 focus-visible:ring-primary/20 focus-visible:border-primary h-12 text-sm font-medium transition-all"
                        placeholder="Your last name"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 px-1 font-bold">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/30" />
                      <Input 
                        id="email" 
                        value={user.email} 
                        disabled 
                        className="pl-11 bg-muted/30 rounded-xl cursor-not-allowed border-dashed border-border/40 h-12 text-sm font-medium text-muted-foreground/70"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 px-1 mt-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-none">Email is managed by your organization and cannot be updated.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-4 pb-8 px-8 gap-4 border-t bg-muted/5">
                <p className="text-[10px] text-muted-foreground leading-tight max-w-[240px] text-center sm:text-left">
                  Last updated on {new Date(user.updatedAt).toLocaleDateString()} at {new Date(user.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                </p>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || isUploading}
                  className="w-full sm:w-auto rounded-xl px-10 h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.03] active:scale-95 bg-primary text-primary-foreground"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Apply Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
