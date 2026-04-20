export const PLATFORMS = [
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    color: 'bg-blue-700', 
    textColor: 'text-white',
    iconText: 'In'
  },
  { 
    id: 'twitter', 
    name: 'Twitter (X)', 
    color: 'bg-black', 
    textColor: 'text-white',
    iconText: 'X'
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    color: 'bg-gradient-to-br from-purple-500 to-pink-500', 
    textColor: 'text-white', 
    comingSoon: true,
    iconText: 'Ig'
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    color: 'bg-blue-600', 
    textColor: 'text-white', 
    comingSoon: true,
    iconText: 'Fb'
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    color: 'bg-red-600', 
    textColor: 'text-white', 
    comingSoon: true,
    iconText: 'Yt'
  }
];

export const getPlatformById = (id) => PLATFORMS.find(p => p.id === id);
