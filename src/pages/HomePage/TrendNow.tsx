import { useNavigate } from "react-router-dom";

const TrendNow = () => {
    const navigate = useNavigate();

    return (
        <div>
            <h2 className="text-lg md:text-xl font-bold mb-3">Trending Now</h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x">
                <div
                    className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden snap-start cursor-pointer group"
                    onClick={() => navigate('/video/3')}
                >
                    <img src="/assets/episode2.webp" alt="Trending" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div
                    className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden snap-start cursor-pointer group"
                    onClick={() => navigate('/video/2')}
                >
                    <img src="/assets/episode1.webp" alt="Trending" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div
                    className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden snap-start cursor-pointer group"
                    onClick={() => navigate('/video/1')}
                >
                    <img src="/assets/poster.png" alt="Trending" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
            </div>
        </div>
    );
};

export default TrendNow;