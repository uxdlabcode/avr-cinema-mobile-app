import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Plus, ChevronLeft, ChevronDown, Share2, Cast } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Static movie data store
const MOVIES_DATA: Record<string, {
  title: string;
  image: string;
  year: string;
  duration: string;
  rating: string;
  quality: string;
  description: string;
  seasons: { label: string; episodes: { id: number; title: string; image: string; duration: string }[] }[];
  cast: { name: string; image: string }[];
  related: { id: number; title: string; image: string }[];
}> = {
  '1': {
    title: 'Anweshippin Kandethum',
    image: '/assets/poster.png',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'Wrongfully suspended while pursuing the culprit in a missing persons case, a cop seeks redemption – and justice – when he gets a new assignment.',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'This Is What Happens', image: '/assets/episode1.webp', duration: '42m' },
          { id: 2, title: 'Good for the End', image: '/assets/episode2.webp', duration: '38m' },
          { id: 3, title: 'The Beginning', image: '/assets/poster.png', duration: '45m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: 2, title: 'The Office', image: '/assets/episode1.webp' },
      { id: 3, title: 'Lord of the Rings', image: '/assets/episode2.webp' },
      { id: 4, title: 'Stranger Things', image: '/assets/poster.png' },
      { id: 5, title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  },
  '2': {
    title: 'The Office',
    image: '/assets/episode1.webp',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'A mockumentary on a group of typical office workers, where the weights of the day are carried by the employees.',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'This Is What Happens', image: '/assets/episode1.webp', duration: '42m' },
          { id: 2, title: 'Good for the End', image: '/assets/episode2.webp', duration: '38m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: 1, title: 'Anweshippin Kandethum', image: '/assets/poster.png' },
      { id: 3, title: 'Lord of the Rings', image: '/assets/episode2.webp' },
      { id: 5, title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  },
  '3': {
    title: 'Lord of the Rings',
    image: '/assets/episode2.webp',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth.',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'The Fellowship', image: '/assets/episode2.webp', duration: '178m' },
          { id: 2, title: 'The Two Towers', image: '/assets/episode1.webp', duration: '179m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: 1, title: 'Anweshippin Kandethum', image: '/assets/poster.png' },
      { id: 2, title: 'The Office', image: '/assets/episode1.webp' },
      { id: 5, title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  }
};

// Fallback for any ID not in our data
const DEFAULT_MOVIE = MOVIES_DATA['1'];

const VideoDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showFullDescription, setShowFullDescription] = useState(false);

  const movie = (id && MOVIES_DATA[id]) ? MOVIES_DATA[id] : DEFAULT_MOVIE;

  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0">
      
      {/* Hero Video/Image Section */}
      <div className="relative w-full aspect-video">
        <img src={movie.image} alt={movie.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors">
              <Cast className="w-5 h-5 text-white" />
            </button>
            <button className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors border-2 border-white/30">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 pb-3 z-10">
          <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-secondary-foreground w-1/3 rounded-full" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">23:14</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 md:px-8 max-w-4xl mx-auto space-y-6 pt-4">

        {/* Title & Meta */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{movie.title}</h1>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>{movie.year}</span>
              <span>•</span>
              <span>{movie.duration}</span>
              <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-xs font-medium">{movie.rating}</span>
              <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-xs font-medium">{movie.quality}</span>
            </div>
          </div>
          <img src="/assets/logo.png" alt="AVR Exclusive" className="w-16 h-auto opacity-80" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-900 hover:text-white font-semibold py-5 rounded-lg">
            <Plus className="w-5 h-5 mr-2" />
            My List
          </Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90 text-secondary font-semibold py-5 rounded-lg">
            <Play className="w-5 h-5 mr-2 fill-secondary text-secondary" />
            Play S1·E1
          </Button>
        </div>

        {/* Season Selector */}
        <div className="flex justify-center">
          <button className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-zinc-300 border-b-2 border-zinc-600 hover:text-white transition-colors">
            {movie.seasons[0].label} <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Episodes */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x">
          {movie.seasons[0].episodes.map((ep) => (
            <div key={ep.id} className="shrink-0 w-40 md:w-48 snap-start space-y-2 cursor-pointer group">
              <div className="relative aspect-video rounded-md overflow-hidden bg-zinc-900">
                <img src={ep.image} alt={ep.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-1 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-medium text-zinc-300">
                  {ep.duration}
                </div>
              </div>
              <p className="text-xs font-medium text-zinc-300 truncate">E{ep.id} • {ep.title}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800" />

        {/* Description */}
        <div className="space-y-2">
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-base font-semibold text-primary flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            Description <ChevronDown className={`w-4 h-4 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} />
          </button>
          <p className={`text-sm text-zinc-400 leading-relaxed ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {movie.description}
          </p>
        </div>

        {/* Cast & Crew */}
        <div className="space-y-3">
          <button className="text-base font-semibold text-primary flex items-center gap-1 hover:opacity-80 transition-opacity">
            Cast &amp; Crew <ChevronDown className="w-4 h-4" />
          </button>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {movie.cast.map((person, index) => (
              <div key={index} className="shrink-0 text-center space-y-2 w-16">
                <div className="w-14 h-14 rounded-full overflow-hidden mx-auto border-2 border-zinc-800">
                  <img src={person.image} alt={person.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] text-zinc-400 truncate">{person.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related */}
        <div className="space-y-3">
          <button className="text-base font-semibold text-primary flex items-center gap-1 hover:opacity-80 transition-opacity">
            Related <ChevronDown className="w-4 h-4" />
          </button>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
            {movie.related.map((item) => (
              <div
                key={item.id}
                className="relative shrink-0 w-32 md:w-44 aspect-[2/3] rounded-md overflow-hidden snap-start cursor-pointer group"
                onClick={() => navigate(`/video/${item.id}`)}
              >
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default VideoDetails;
