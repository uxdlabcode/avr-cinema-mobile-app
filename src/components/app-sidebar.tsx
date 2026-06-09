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
  Film,
  Settings,
  LogIn,
  UserPlus,
} from "lucide-react"

import LogoImage from "@/assets/Media (3) 1.png"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { Link, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
  SidebarGroup,
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
      isActive: false,
    },
    {
      title: "System Settings",
      url: "/home",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const location = useLocation()
  const user = useSelector((state: RootState) => state.auth.user)

  const navItems = data.superadminNav

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent focus-visible:bg-transparent">
              <Link to="/dashboard" className="flex items-center justify-start">
                {state === "collapsed" ? (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Film className="size-5" />
                  </div>
                ) : (
                  <div className="flex items-center justify-start w-full py-1">
                    <img
                      src={LogoImage}
                      alt="AVR Cinema"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === "/profile"}
                tooltip="My Profile"
              >
                <Link to="/profile">
                  <User className="size-4" />
                  <span>My Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === "/signin"}
                tooltip="Sign In"
              >
                <Link to="/signin">
                  <LogIn className="size-4" />
                  <span>Sign In</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === "/signup"}
                tooltip="Sign Up"
              >
                <Link to="/signup">
                  <UserPlus className="size-4" />
                  <span>Sign Up</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.name || 'User',
          email: user?.email || '',
          avatar: data.user.avatar
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

