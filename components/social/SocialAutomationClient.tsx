'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateSocialPostAction,
  saveSocialPostAction,
  deleteSocialPostAction,
  listSocialPostsAction,
  publishSocialPostAction,
  uploadSocialImageAction,
  listSocialConnectionsAction,
} from '@/lib/services/social-automation-actions';
import SocialConnectionsBar from '@/components/social/SocialConnectionsBar';
import Button from '@/components/ui/premium/Button';
import Select from '@/components/ui/premium/Select';
import Textarea from '@/components/ui/premium/Textarea';
import { Sparkles, Trash2, Copy, Check, Upload, Send, ImageIcon, X } from 'lucide-react';

type Post = {
  id: string;
  platform: string;
  content: string;
  status: string;
  image_path: string | null;
  scheduled_at: string | null;
  created_at: string;
  published_at: string | null;
  external_post_id: string | null;
  publish_error: string | null;
};

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
];

const TOPICS = [
  'Spring pet wellness checkup reminder',
  'New puppy vaccination schedule tips',
  'Thank our clients for 5-star reviews',
  'Holiday boarding availability',
];

interface SocialAutomationClientProps {
  activeBranchId: string;
  clinicName: string;
  pickPageId?: string | null;
  flashConnected?: string | null;
  flashError?: string | null;
}

export default function SocialAutomationClient({
  activeBranchId,
  clinicName,
  pickPageId,
  flashConnected,
  flashError,
}: SocialAutomationClientProps) {
  const [platform, setPlatform] = useState('instagram');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async () => {
    const [postsRes, connRes] = await Promise.all([
      listSocialPostsAction(activeBranchId),
      listSocialConnectionsAction(activeBranchId),
    ]);
    if (postsRes.success) setPosts(postsRes.posts as Post[]);
    if (connRes.success) {
      setConnectedPlatforms(new Set(connRes.connections.map((c) => c.platform)));
    }
  }, [activeBranchId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const isConnected = connectedPlatforms.has(platform);
  const needsImage = platform === 'instagram';
  const canPublish = content.trim().length >= 10 && isConnected && (!needsImage || imagePath);

  const onFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append('branchId', activeBranchId);
    fd.append('image', file);
    const res = await uploadSocialImageAction(fd);
    setUploading(false);
    if (res.success && res.imagePath) {
      setImagePath(res.imagePath);
      setImagePreview(res.imageUrl || null);
    } else {
      setError(res.error || 'Upload failed');
    }
  };

  const generate = async () => {
    if (!topic.trim()) {
      setError('Enter a topic or pick a suggestion.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await generateSocialPostAction({
      platform: platform as 'facebook' | 'instagram',
      topic: topic.trim(),
      tone: 'friendly',
    });
    setLoading(false);
    if (res.success && res.content) setContent(res.content);
    else setError(res.error || 'Generation failed.');
  };

  const save = async (andPublish = false) => {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    const res = await saveSocialPostAction({
      platform: platform as 'facebook' | 'instagram',
      content: content.trim(),
      branchId: activeBranchId,
      imagePath,
    });
    setSaving(false);
    if (!res.success || !res.post) {
      setError(res.error || 'Save failed.');
      return;
    }
    if (andPublish) {
      await publishById(res.post.id);
    } else {
      setContent('');
      setTopic('');
      clearImage();
      loadPosts();
    }
  };

  const publishById = async (postId: string) => {
    setPublishing(true);
    setError(null);
    const res = await publishSocialPostAction({ postId });
    setPublishing(false);
    if (res.success) {
      setContent('');
      setTopic('');
      clearImage();
      loadPosts();
    } else {
      setError(res.error || 'Publish failed.');
      loadPosts();
    }
  };

  const clearImage = () => {
    setImagePath(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = async (id: string) => {
    const res = await deleteSocialPostAction({ postId: id });
    if (res.success) loadPosts();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-500/15 text-emerald-400';
      case 'failed':
        return 'bg-destructive/15 text-destructive';
      case 'scheduled':
        return 'bg-amber-500/15 text-amber-400';
      default:
        return 'bg-surface-container-high text-on-surface-variant';
    }
  };

  return (
    <div className="space-y-6">
      <SocialConnectionsBar
        activeBranchId={activeBranchId}
        pickPageId={pickPageId}
        flashConnected={flashConnected}
        flashError={flashError}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Compose post</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Upload an image, write or AI-generate a caption, then publish to {clinicName}.
            </p>
          </div>

          <Select
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={PLATFORMS.map((p) => ({
              value: p.value,
              label: `${p.label}${!connectedPlatforms.has(p.value) ? ' (not connected)' : ''}`,
            }))}
          />

          <div>
            <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
              Image {needsImage ? '(required for Instagram)' : '(optional)'}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-outline-variant/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Post preview" className="w-full max-h-48 object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full py-8 border-2 border-dashed border-outline-variant/50 rounded-xl flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <ImageIcon className="w-6 h-6 text-on-surface-variant" />
                <span className="text-xs text-on-surface-variant">
                  {uploading ? 'Uploading…' : 'Click to upload JPG, PNG, or WebP'}
                </span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
              Topic (for AI caption)
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Summer flea & tick prevention"
              className="w-full px-4 py-3 bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl outline-none text-sm text-on-surface"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="text-[9px] font-semibold px-2 py-1 rounded-full border border-outline-variant/50 hover:border-primary/30 text-on-surface-variant"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={generate}
            loading={loading}
            icon={<Sparkles className="w-4 h-4" />}
            className="w-full"
          >
            Generate caption with AI
          </Button>

          <Textarea
            label="Caption"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Write your caption or generate one with AI."
          />

          {error && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          {!isConnected && (
            <p className="text-[10px] text-amber-400">
              Connect {platform} above before publishing.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={copy} disabled={!content} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => save(false)} loading={saving} disabled={!content.trim()}>
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() => save(true)}
              loading={publishing || saving}
              disabled={!canPublish}
              icon={<Send className="w-4 h-4" />}
              className="flex-1"
            >
              Publish now
            </Button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6">
          <h3 className="text-sm font-bold text-on-surface mb-4">Posts</h3>
          {posts.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-12">No posts yet.</p>
          ) : (
            <ul className="space-y-3 max-h-[640px] overflow-y-auto">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="p-4 rounded-xl border border-outline-variant/40 bg-surface-container/30"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase text-primary">{p.platform}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                  {p.image_path && (
                    <p className="text-[9px] text-on-surface-variant mb-1 flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Image attached
                    </p>
                  )}
                  <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {p.content}
                  </p>
                  {p.publish_error && (
                    <p className="text-[10px] text-destructive mt-2">{p.publish_error}</p>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-outline-variant/30">
                    <span className="text-[9px] text-on-surface-variant">
                      {p.published_at
                        ? `Published ${new Date(p.published_at).toLocaleDateString()}`
                        : new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      {p.status === 'draft' && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1 !px-2 text-[10px]"
                          loading={publishing}
                          onClick={() => publishById(p.id)}
                        >
                          Publish
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
