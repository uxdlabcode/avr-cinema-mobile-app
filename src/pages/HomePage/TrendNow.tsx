import { useNavigate } from "react-router-dom";

const TrendNow = () => {
    const navigate = useNavigate();

    const items = [
        { id: 3, img: "/assets/episode2.webp" },
        { id: 2, img: "/assets/episode1.webp" },
        { id: 1, img: "/assets/poster.png" }
    ];

    return (
        <div className="space-y-1 text-left">
            <h2 className="text-lg md:text-xl font-bold mb-3">Trending Now</h2>
            <div className="flex gap-10 sm:gap-14 md:gap-18 overflow-x-auto scrollbar-hide pb-6 snap-x pl-10 sm:pl-16 md:pl-20">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="flex-none relative snap-start group/trending pt-4"
                    >
                        {/* Giant transparent rank number with thick white border */}
                        <span 
                            className="absolute left-0 bottom-[-5px] md:bottom-[-15px] text-8xl sm:text-9xl md:text-[10rem] font-black leading-none select-none z-30 pointer-events-none transition-transform duration-300 group-hover/trending:scale-105"
                            style={{
                                WebkitTextStroke: '2px #fff',
                                color: 'transparent',
                                fontFamily: 'Impact, Arial Black, sans-serif',
                                filter: 'drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.8))',
                                translate: '-50% 0px',
                            }}
                        >
                            {index + 1}
                        </span>

                        {/* Movie Card Poster */}
                        <div
                            className="relative z-20 shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950"
                            onClick={() => navigate(`/video/${item.id}`)}
                        >
                            <img 
                                src={item.img} 
                                alt="Trending" 
                                className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" 
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TrendNow;