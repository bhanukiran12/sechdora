import { User, Heart, MessageCircle, Send, Bookmark, Share2, ThumbsUp, Repeat2, MoreHorizontal, Globe, Play } from "lucide-react";

function Avatar({ size = "w-10 h-10" }) {
  return <div className={`${size} rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center`}><User className="w-1/2 h-1/2 text-gray-500" /></div>;
}

export function InstagramPreview({ content, username = "yourhandle" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto overflow-hidden" data-testid="preview-instagram">
      <div className="flex items-center gap-3 p-3 border-b border-gray-100">
        <Avatar size="w-8 h-8" />
        <span className="font-semibold text-sm">{username}</span>
        <MoreHorizontal className="w-5 h-5 ml-auto text-gray-500" />
      </div>
      <div className="w-full aspect-square bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center text-gray-400">
        <span className="text-xs uppercase tracking-wider font-bold">Image Preview</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6" />
          <MessageCircle className="w-6 h-6" />
          <Send className="w-6 h-6" />
          <Bookmark className="w-6 h-6 ml-auto" />
        </div>
        <p className="text-sm"><span className="font-semibold">{username}</span> {content?.slice(0, 200)}</p>
      </div>
    </div>
  );
}

export function FacebookPreview({ content, username = "Your Page" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto overflow-hidden" data-testid="preview-facebook">
      <div className="flex items-center gap-3 p-3">
        <Avatar size="w-10 h-10" />
        <div>
          <div className="font-semibold text-sm">{username}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Just now</span>
            <span>&middot;</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-sm">{content?.slice(0, 300)}</p>
      </div>
      <div className="w-full aspect-video bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-gray-400">
        <span className="text-xs uppercase tracking-wider font-bold">Media Preview</span>
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500 font-medium">
          <button className="flex items-center gap-2 hover:bg-gray-50 px-4 py-1.5 rounded">
            <ThumbsUp className="w-4 h-4" /> Like
          </button>
          <button className="flex items-center gap-2 hover:bg-gray-50 px-4 py-1.5 rounded">
            <MessageCircle className="w-4 h-4" /> Comment
          </button>
          <button className="flex items-center gap-2 hover:bg-gray-50 px-4 py-1.5 rounded">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

export function TwitterPreview({ content, username = "yourhandle" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto overflow-hidden p-4" data-testid="preview-twitter">
      <div className="flex gap-3">
        <Avatar size="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm">{username}</span>
            <span className="text-gray-500 text-sm">@{username}</span>
            <span className="text-gray-500 text-sm">&middot; now</span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{content?.slice(0, 280)}</p>
          {content?.length > 280 && <p className="text-xs text-gray-400 mt-1">...truncated at 280 chars</p>}
          <div className="flex items-center justify-between mt-3 text-gray-500 max-w-[300px]">
            <button className="flex items-center gap-1 text-xs hover:text-blue-500"><MessageCircle className="w-4 h-4" /> 0</button>
            <button className="flex items-center gap-1 text-xs hover:text-green-500"><Repeat2 className="w-4 h-4" /> 0</button>
            <button className="flex items-center gap-1 text-xs hover:text-red-500"><Heart className="w-4 h-4" /> 0</button>
            <button className="flex items-center gap-1 text-xs hover:text-blue-500"><Share2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInPreview({ content, username = "Your Name" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto overflow-hidden" data-testid="preview-linkedin">
      <div className="flex items-start gap-3 p-3">
        <Avatar size="w-12 h-12" />
        <div>
          <div className="font-semibold text-sm">{username}</div>
          <div className="text-xs text-gray-500">Your Title | Company</div>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <span>Just now</span>
            <span>&middot;</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-sm whitespace-pre-wrap">{content?.slice(0, 500)}</p>
      </div>
      <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-gray-400">
        <span className="text-xs uppercase tracking-wider font-bold">Article / Image Preview</span>
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500 font-medium">
          <button className="flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded">
            <ThumbsUp className="w-4 h-4" /> Like
          </button>
          <button className="flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded">
            <MessageCircle className="w-4 h-4" /> Comment
          </button>
          <button className="flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded">
            <Repeat2 className="w-4 h-4" /> Repost
          </button>
          <button className="flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded">
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

export function YouTubePreview({ content, username = "Your Channel" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto overflow-hidden" data-testid="preview-youtube">
      <div className="w-full aspect-video bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center relative">
        <div className="w-16 h-12 bg-red-600 rounded-xl flex items-center justify-center">
          <Play className="w-6 h-6 text-white fill-white" />
        </div>
        <div className="absolute bottom-2 right-2 bg-black text-white text-xs px-1.5 py-0.5 rounded">10:30</div>
      </div>
      <div className="p-3">
        <div className="flex gap-3">
          <Avatar size="w-9 h-9" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2">{content?.slice(0, 100) || "Video Title"}</h3>
            <p className="text-xs text-gray-500 mt-1">{username}</p>
            <p className="text-xs text-gray-500">0 views &middot; Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostPreview({ content, platforms, username }) {
  const previewMap = {
    instagram: InstagramPreview,
    facebook: FacebookPreview,
    twitter: TwitterPreview,
    linkedin: LinkedInPreview,
    youtube: YouTubePreview,
  };

  if (!platforms || platforms.length === 0) return null;

  return (
    <div className="space-y-6" data-testid="post-previews">
      {platforms.map((platform) => {
        const Preview = previewMap[platform];
        if (!Preview) return null;
        return (
          <div key={platform}>
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-2">{platform} Preview</div>
            <Preview content={content} username={username} />
          </div>
        );
      })}
    </div>
  );
}
