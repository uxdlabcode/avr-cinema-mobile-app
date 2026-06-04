import { Play, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RecentWatch = () => {
    const navigate = useNavigate();

    return (
        <div>
            <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center text-primary cursor-pointer">
                Continue Watching on AVR <ChevronRight className="w-5 h-5 ml-1 text-primary" />
            </h2>

            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
                {/* Item 1 */}
                <div
                    className="relative shrink-0 w-64 md:w-72 aspect-video rounded-md overflow-hidden snap-start cursor-pointer group"
                    onClick={() => navigate('/video/1')}
                >
                    <img src="/assets/episode1.webp" alt="Episode 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                        <Play className="w-6 h-6 text-primary drop-shadow-md fill-primary" />
                        <span className="text-xs font-semibold drop-shadow-md text-primary">S1 : E4</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary-foreground/30">
                        <div className="h-full bg-secondary-foreground w-1/3" />
                    </div>
                </div>

                {/* Item 2 */}
                <div
                    className="relative shrink-0 w-64 md:w-72 aspect-video rounded-md overflow-hidden snap-start cursor-pointer group"
                    onClick={() => navigate('/video/2')}
                >
                    <img src="/assets/episode2.webp" alt="Episode 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                        <Play className="w-6 h-6 text-primary drop-shadow-md fill-primary" />
                        <span className="text-xs font-semibold drop-shadow-md text-primary">S2 : E1</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary-foreground/30">
                        <div className="h-full bg-secondary-foreground w-2/3" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecentWatch;