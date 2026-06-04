"use client"

import * as React from "react"
import {
  AudioWaveform,
  Activity,
  CheckCircle,
  Command,
  DollarSign,
  FileText,
  Folder,
  GalleryVerticalEnd,
  Heart,
  LayoutDashboard,
  MapPin,
  Receipt,
  Star,
  User,
  Users,
  Wrench, 
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { motion } from "framer-motion"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { Link } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  superadminNav: [
    {
      title: "Admin Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Manage Projects",
      url: "/projects",
      icon: Folder,
    },
    {
      title: "System Settings",
      url: "/settings",
      icon: User,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const user = useSelector((state: RootState) => state.user)

  const navItems = data.superadminNav
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link to="/dashboard">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group flex items-center gap-2.5 rounded-lg p-1 -ml-1 cursor-pointer"
          >
            <div className="relative">
              <motion.div
                whileHover={{ rotate: 45 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Wrench className="h-7 w-7 text-white transition-transform sm:h-8 sm:w-8 bg-primary p-1 rounded-full" />
              </motion.div>
            </div>
            {state !== "collapsed" && (
              <span className="text-xl font-bold sm:text-2xl">
                <span className="text-gray-900 dark:text-white">Zip</span>
                <span className="text-primary">Fixer</span>
              </span>
            )}
          </motion.div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: 'Super Admin',
          email: user?.email || 'admin@avr.com',
          avatar: data.user.avatar
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

