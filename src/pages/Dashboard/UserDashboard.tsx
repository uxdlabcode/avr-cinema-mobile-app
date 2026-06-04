import { useState, useEffect } from "react";
import { Plus, Clipboard, FileText, MessageSquare, CheckCircle, ChevronRight, Star, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const stats = [
  {
    title: "Total Users",
    value: "1,248",
    icon: Clipboard,
    trend: "+24 this week",
    trendUp: true,
    color: "from-blue-500 to-blue-600",
    lightColor: "blue",
  },
  {
    title: "Platform Projects",
    value: "342",
    icon: FileText,
    trend: "+12 vs last month",
    trendUp: true,
    color: "from-orange-500 to-orange-600",
    lightColor: "orange",
  },
  {
    title: "Active Professionals",
    value: "156",
    icon: MessageSquare,
    trend: "5 pending approval",
    color: "from-purple-500 to-purple-600",
    lightColor: "purple",
  },
  {
    title: "System Status",
    value: "99.9%",
    icon: CheckCircle,
    trend: "All systems functional",
    color: "from-green-500 to-green-600",
    lightColor: "green",
  },
];

const recentProjects = [
  {
    id: 1,
    title: "Kitchen Cabinet Painting",
    client: "Modern Living Co.",
    date: "Oct 12, 2023",
    status: "In Progress",
    progress: 65,
    statusColor: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=100&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Garden Maintenance",
    client: "Green Leaf Estates",
    date: "Oct 18, 2023",
    status: "Pending Review",
    progress: 30,
    statusColor: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    image: "https://images.unsplash.com/photo-1683316924890-6a8c5ab10d29?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Z2FyZGVuJTIwbWFpbnRlbmFuY2V8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: 3,
    title: "Roof Gutter Repair",
    client: "Summit Properties",
    date: "Oct 05, 2023",
    status: "Completed",
    progress: 100,
    statusColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    image: "https://images.unsplash.com/photo-1632759145351-1d592919f522?q=80&w=100&auto=format&fit=crop",
  },
];

const recentMessages = [
  {
    id: 1,
    name: "Sarah Miller",
    role: "Project Manager",
    message: "I've sent the revised quote for the kitchen renovation. Please review when you have a moment.",
    time: "2m ago",
    avatar: "https://github.com/shadcn.png",
    unread: true,
  },
  {
    id: 2,
    name: "David Chen",
    role: "Lead Architect",
    message: "Will you be available this Friday at 2 PM for the site inspection?",
    time: "1h ago",
    avatar: "https://github.com/shadcn.png",
    unread: true,
  },
  {
    id: 3,
    name: "Emily White",
    role: "Client",
    message: "Looking forward to working on the bathroom remodel. Let's schedule a call.",
    time: "Yesterday",
    avatar: "https://github.com/shadcn.png",
    unread: false,
  },
];

const upcomingSchedule = [
  {
    id: 1,
    title: "Kitchen Painting Start",
    client: "Bright Spark Electric",
    time: "8:00 AM",
    duration: "3 hours",
    type: "Installation",
  },
  {
    id: 2,
    title: "Garden Consultation",
    client: "Green Leaf",
    time: "2:00 PM",
    duration: "1.5 hours",
    type: "Consultation",
  },
  {
    id: 3,
    title: "Material Delivery",
    client: "Home Depot",
    time: "10:00 AM",
    duration: "30 min",
    type: "Delivery",
  },
];

const localPros = [
  {
    id: 1,
    name: "Bright Spark Electric",
    rating: 4.9,
    reviews: 124,
    specialties: ["Residential Wiring", "Lighting", "Emergency Repairs"],
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=100&auto=format&fit=crop",
    available: true,
  },
  {
    id: 2,
    name: "Apex Plumbing & Heating",
    rating: 4.8,
    reviews: 89,
    specialties: ["Emergency Repair", "Installation", "Maintenance"],
    image: "https://images.unsplash.com/photo-1581578731522-745d05db9a26?q=80&w=100&auto=format&fit=crop",
    available: true,
  },
];

const LoadingSkeleton = () => {
  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto animate-pulse">
      {/* Welcome Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-12 w-48 rounded" />
      </div>

      {/* Stats Section Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="px-6 py-6">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-end justify-between">
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Recent Projects Skeleton */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border bg-white dark:bg-zinc-900 overflow-hidden">
                  <CardContent className="px-5 py-5">
                    <div className="flex items-start gap-5">
                      <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="h-2 w-full" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Recommended Pros Skeleton */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map((i) => (
                <Card key={i} className="border bg-white dark:bg-zinc-900 overflow-hidden">
                  <CardContent className="px-5 py-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-8">
          {/* Messages Skeleton */}
          <Card className="border bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Schedule Skeleton */}
          <Card className="border bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="w-[60px] h-[60px] rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const UserDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen  dark:from-zinc-950 dark:to-zinc-900">
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
          {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                Superadmin Portal
              </h1>
            </div>
            <p className="text-muted-foreground text-base">
              Here's what's happening on the platform today.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border  hover:shadow-lg transition-all duration-300 bg-white dark:bg-zinc-900 overflow-hidden group">
                  <CardContent className="px-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge variant="outline" className="bg-gray-50 dark:bg-zinc-800 border text-xs font-medium">
                        Last 30 days
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                        <span className={`text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-orange-600'} bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full`}>
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Recent Projects */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Recent Projects</h2>
                  <p className="text-sm text-muted-foreground mt-1">You have 3 active projects</p>
                </div>
                <Button variant="ghost" className="text-[#0AC4E0] hover:text-[#089DB4] hover:bg-[#0AC4E0]/10 cursor-pointer">
                  View All Projects
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="flex flex-col gap-4">
                {recentProjects.map((project) => (
                  <Card key={project.id} className="group hover:shadow-lg transition-all cursor-pointer border  bg-white dark:bg-zinc-900 overflow-hidden">
                    <CardContent className="px-5">
                      <div className="flex items-start gap-5">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-md">
                          <img 
                            src={project.image} 
                            alt={project.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-lg group-hover:text-[#0AC4E0] transition-colors">
                                {project.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-0.5">{project.client}</p>
                            </div>
                            <Badge className={`${project.statusColor} border px-3 py-1 font-medium rounded-full`}>
                              {project.status}
                            </Badge>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} className="h-2 bg-gray-100 dark:bg-zinc-800" />
                          </div>
                          
                          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{project.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recommended Local Pros */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Recommended Pros</h2>
                  <p className="text-sm text-muted-foreground mt-1">Top-rated professionals near you</p>
                </div>
                <Button variant="ghost" className="text-[#0AC4E0] hover:text-[#089DB4] hover:bg-[#0AC4E0]/10">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {localPros.map((pro) => (
                  <Card key={pro.id} className="group hover:shadow-xl transition-all border  bg-white dark:bg-zinc-900 overflow-hidden">
                    <CardContent className="px-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 ring-4 ring-white dark:ring-zinc-800 shadow-xl">
                          <AvatarImage src={pro.image} />
                          <AvatarFallback className="bg-gradient-to-br from-[#0AC4E0] to-[#089DB4] text-white">
                            {pro.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold group-hover:text-[#0AC4E0] transition-colors">
                                {pro.name}
                              </h4>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold text-sm">{pro.rating}</span>
                                <span className="text-muted-foreground text-xs">({pro.reviews} reviews)</span>
                              </div>
                            </div>
                            {pro.available && (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {pro.specialties.map((specialty, i) => (
                              <Badge key={i} variant="secondary" className="bg-gray-100 dark:bg-zinc-800 border text-xs font-normal">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                          
                          <Button className="w-full mt-4 bg-gradient-to-r from-[#0AC4E0] to-[#089DB4] hover:from-[#089DB4] hover:to-[#067A8F] text-white border shadow-md shadow-[#0AC4E0]/20">
                            Hire Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-8">
            {/* Recent Messages */}
            <Card className="border  bg-white dark:bg-zinc-900 overflow-hidden ">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">Messages</CardTitle>
                    <CardDescription>You have 5 unread messages</CardDescription>
                  </div>
                  <Badge className="bg-red-500 hover:bg-red-600 text-white border px-3 py-1">
                    5 New
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {recentMessages.map((msg, i) => (
                  <div key={msg.id}>
                    <div className="flex gap-3 group cursor-pointer">
                      <div className="relative shrink-0">
                        <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-zinc-800">
                          <AvatarImage src={msg.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                            {msg.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        {msg.unread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold group-hover:text-[#0AC4E0] transition-colors">
                              {msg.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">{msg.role}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1.5">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                    {i < recentMessages.length - 1 && <Separator className="mt-5" />}
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-2 border-2 hover:border-[#0AC4E0] hover:text-[#0AC4E0] transition-colors rounded-xl">
                  Open Messages
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Schedule */}
            <Card className="border  bg-white dark:bg-zinc-900 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Today's Schedule</CardTitle>
                <CardDescription>3 events scheduled</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {upcomingSchedule.map((item, i) => (
                  <div key={item.id}>
                    <div className="flex items-start gap-4 group">
                      <div className="bg-gradient-to-br from-[#0AC4E0] to-[#089DB4] rounded-xl p-3 text-center min-w-[60px] shadow-md">
                        <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                          {item.time.split(' ')[1]}
                        </div>
                        <div className="text-lg font-black text-white leading-tight">
                          {item.time.split(':')[0]}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold group-hover:text-[#0AC4E0] transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.client}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{item.duration}</span>
                          </div>
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-zinc-800 border text-xs">
                            {item.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {i < upcomingSchedule.length - 1 && <Separator className="mt-5" />}
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-2 border-2 hover:border-[#0AC4E0] hover:text-[#0AC4E0] transition-colors rounded-xl">
                  View Full Schedule
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};