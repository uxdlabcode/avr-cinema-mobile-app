export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6 bg-background">
      <div className="max-w-md text-center">
        
        {/* GIF */}
        <img
          src="https://cdn.dribbble.com/userupload/19642411/file/original-3e9a3a9251a7dc89b969a385143f91e1.gif"
          alt="404 Not Found"
          className="w-full max-w-sm mx-auto mb-6 rounded-lg"
        />

        {/* 404 Text */}
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">
          Oops! The page you're looking for doesn't exist.
        </p>

      </div>
    </div>
  );
}