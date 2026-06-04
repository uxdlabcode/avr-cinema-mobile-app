import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

type Props = {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        {/* Top bar */}
        <header className="flex h-12 items-center justify-between border-b px-4">
          <div className="flex items-center">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
