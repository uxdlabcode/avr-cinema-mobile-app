import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="h-4 w-4" style={{ color: "rgb(var(--success))" }} />
        ),
        info: <InfoIcon className="h-4 w-4" style={{ color: "rgb(var(--info))" }} />,
        warning: (
          <TriangleAlertIcon className="h-4 w-4" style={{ color: "rgb(var(--warning))" }} />
        ),
        error: <OctagonXIcon className="h-4 w-4" style={{ color: "var(--destructive)" }} />,
        loading: (
          <Loader2Icon className="h-4 w-4 text-muted-foreground animate-spin" style={{ color: "var(--muted-foreground)" }} />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }