import React, { useState } from 'react';
import { Trash2, Image as ImageIcon, Calendar, Upload, Loader2, X, Plus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { PLATFORMS } from '@/constants/platforms';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://sechdora.onrender.com";
const API = `${BACKEND_URL}/api`;

const MAX_IMAGES = 10;

export default function BulkPostCard({ 
  index, 
  post, 
  updatePost, 
  removePost 
}) {
  const [uploading, setUploading] = useState(false);
  
  // Migration/Helper: ensure media_urls is an array
  const media_urls = post.media_urls || (post.media_url ? [post.media_url] : []);

  const normalizeUrl = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const resolvePreviewUrl = (url) => {
    const resolved = normalizeUrl(url);
    if (!resolved) return "";
    try {
      const token = localStorage.getItem("access_token");
      const parsed = new URL(resolved);
      if (parsed.origin === new URL(BACKEND_URL).origin && token) {
        parsed.searchParams.set("auth", token);
        return parsed.toString();
      }
      return resolved;
    } catch {
      return resolved;
    }
  };

  const handleChange = (field, value) => {
    updatePost(index, { ...post, [field]: value });
  };

  const togglePlatform = (platformId) => {
    const current = post.platforms || [];
    const updated = current.includes(platformId)
      ? current.filter(id => id !== platformId)
      : [...current, platformId];
    handleChange('platforms', updated);
  };

  const addMediaUrl = (url) => {
    if (media_urls.length >= MAX_IMAGES) {
      toast.warning(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }
    handleChange('media_urls', [...media_urls, normalizeUrl(url)]);
  };

  const removeMedia = (idx) => {
    const updated = media_urls.filter((_, i) => i !== idx);
    handleChange('media_urls', updated);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if (media_urls.length + files.length > MAX_IMAGES) {
      toast.error(`You can only add ${MAX_IMAGES - media_urls.length} more images`);
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('access_token');
    
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API}/upload`, fd, { 
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, 
          withCredentials: true 
        });
        addMediaUrl(res.data.url);
      }
      toast.success("Media added!");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="brutal-card p-6 mb-8 group bg-white shadow-brutal hover:shadow-brutal-lg transition-all duration-150"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black text-lg border-2 border-black rotate-[-3deg] shadow-brutal-hover">
            {index + 1}
          </div>
          <h3 className="font-heading font-black uppercase text-sm tracking-widest">Draft #{index + 1}</h3>
        </div>
        <button 
          onClick={() => removePost(index)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-xl border-2 border-transparent hover:border-red-600 transition-all font-black"
          title="Delete Post"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Content & Platforms */}
        <div className="space-y-6">
          <div className="relative">
            <label className="text-xs font-black uppercase tracking-widest mb-2 block text-text-muted">
              Caption
            </label>
            <textarea
              value={post.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Craft your message here..."
              className="w-full h-40 brutal-input resize-none text-base p-5 focus:bg-primary/5 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest mb-3 block text-text-muted">
              Choose Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  disabled={p.comingSoon}
                  className={`px-4 py-2 rounded-xl border-4 border-black font-black text-xs transition-all flex items-center gap-2 ${
                    p.comingSoon ? 'opacity-30 grayscale cursor-not-allowed' :
                    post.platforms?.includes(p.id) ? `${p.color} ${p.textColor} shadow-brutal translate-x-[-2px] translate-y-[-2px]` : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Media & Schedule */}
        <div className="space-y-6">
            <div className="brutal-card p-5 bg-aiAccent/10 border-black rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Media Gallery ({media_urls.length}/{MAX_IMAGES})
              </label>
              <div className="relative">
                <input 
                  type="file" 
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  onChange={handleFileUpload}
                  disabled={uploading || media_urls.length >= MAX_IMAGES}
                />
                <button className={`brutal-button-sm flex items-center gap-2 bg-aiAccent text-black font-black ${uploading ? 'animate-pulse' : ''}`}>
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add Media
                </button>
              </div>
            </div>

            {/* Gallery Preview */}
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              <AnimatePresence>
                {media_urls.length === 0 ? (
                  <div className="w-full aspect-video border-4 border-dashed border-black/20 rounded-xl flex flex-col items-center justify-center text-text-muted bg-white/50">
                    <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                    <span className="text-xs font-bold uppercase opacity-40">No media added</span>
                  </div>
                ) : (
                  media_urls.map((url, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="min-w-[150px] w-[150px] aspect-square relative rounded-xl border-4 border-black overflow-hidden bg-white shadow-brutalSoft"
                    >
                      <img 
                        src={resolvePreviewUrl(url)} 
                        alt={`Preview ${idx}`} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://placehold.co/400x400?text=Invalid+Image'; }}
                      />
                      <button 
                        onClick={() => removeMedia(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-xl border-2 border-black hover:scale-110 shadow-brutalSoft transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-4">
              <input
                type="url"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    addMediaUrl(e.target.value);
                    e.target.value = '';
                  }
                }}
                placeholder="Or paste external image URL & hit Enter..."
                className="w-full brutal-input text-xs py-2 px-3 bg-white rounded-xl"
              />
            </div>
          </div>

          <div className="brutal-card p-5 bg-primary/5 border-black rounded-xl">
            <label className="text-xs font-black uppercase tracking-widest mb-3 block flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Publish Schedule
            </label>
            <input
              type="datetime-local"
              value={post.scheduled_time || ''}
              onChange={(e) => handleChange('scheduled_time', e.target.value)}
              className="w-full brutal-input text-sm p-3 bg-white font-mono"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
