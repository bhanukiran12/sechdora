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
  }
];

export const getPlatformById = (id) => PLATFORMS.find(p => p.id === id);
