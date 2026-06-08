'use client';

import { useState } from 'react';
import Modal from '@/components/ui/premium/Modal';
import Button from '@/components/ui/premium/Button';
import { BookOpen, ExternalLink, CheckCircle2, Server, User } from 'lucide-react';

const CLINIC_STEPS = [
  {
    title: 'Facebook Page required',
    text: 'You must be an admin of a Facebook Page for your clinic branch. Create one at Meta Business Suite if needed.',
    link: 'https://business.facebook.com/',
    linkLabel: 'Meta Business Suite',
  },
  {
    title: 'Instagram Business (for IG publishing)',
    text: 'Link an Instagram Business or Creator account to your Facebook Page under Page settings → Linked accounts.',
    link: 'https://www.facebook.com/business/help/898752960195806',
    linkLabel: 'Link IG to a Page',
  },
  {
    title: 'Sign in with Facebook or Instagram',
    text: 'On this page, click the sign-in button for the platform you want. You will be redirected to Meta to approve permissions.',
  },
  {
    title: 'Approve permissions',
    text: 'Grant access to manage your Page and (for Instagram) publish content. Only Page admins can complete this step.',
  },
  {
    title: 'Pick your Page (if prompted)',
    text: 'If you manage multiple Pages, select the one for this branch. For Instagram, choose the Page linked to your IG account.',
  },
];

const OPERATOR_STEPS = [
  {
    title: 'Create a Meta Developer app',
    text: 'Go to developers.facebook.com, create an app, and add Facebook Login for Business plus Instagram Graph API products.',
    link: 'https://developers.facebook.com/apps/',
    linkLabel: 'Meta Developer Console',
  },
  {
    title: 'Set OAuth redirect URI',
    text: 'Add your callback URL under Facebook Login settings. Use your production domain on Vercel.',
    code: '{APP_URL}/api/social/meta/callback',
  },
  {
    title: 'Copy App ID and App Secret',
    text: 'From App settings → Basic, copy the App ID and App Secret. Never expose the secret in client-side code.',
  },
  {
    title: 'Request permissions',
    text: 'Ensure these scopes are available: pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish, business_management.',
  },
  {
    title: 'Add environment variables',
    text: 'Set the variables below in Vercel (or .env.local for local dev). Restart the app after saving.',
  },
  {
    title: 'Generate encryption key',
    text: 'Create a random string (32+ characters) for SOCIAL_TOKEN_ENCRYPTION_KEY. Used to encrypt stored Page tokens server-side.',
  },
];

const ENV_VARS = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_REDIRECT_URI',
  'SOCIAL_TOKEN_ENCRYPTION_KEY',
  'NEXT_PUBLIC_APP_URL',
];

interface MetaSetupGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export default function MetaSetupGuideModal({ open, onClose }: MetaSetupGuideModalProps) {
  const [tab, setTab] = useState<'clinic' | 'operator'>('clinic');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meta social publishing setup"
      description="Follow the checklist for your role — clinic admins connect accounts; deploy operators configure the Meta app."
      size="lg"
    >
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab('clinic')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
            tab === 'clinic'
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/20'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Clinic admin
        </button>
        <button
          type="button"
          onClick={() => setTab('operator')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
            tab === 'operator'
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/20'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Deploy operator
        </button>
      </div>

      {tab === 'clinic' ? (
        <ol className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {CLINIC_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">{step.title}</p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{step.text}</p>
                {'link' in step && step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-2 hover:underline"
                  >
                    {step.linkLabel}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          <ol className="space-y-4">
            {OPERATOR_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-on-surface">{step.title}</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{step.text}</p>
                  {'code' in step && step.code && (
                    <code className="block mt-2 text-[10px] font-mono bg-surface-container px-2 py-1.5 rounded-lg border border-outline-variant/50 text-primary">
                      {step.code}
                    </code>
                  )}
                  {'link' in step && step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-2 hover:underline"
                    >
                      {step.linkLabel}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-xl border border-outline-variant/50 bg-surface-container/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Vercel environment variables
            </p>
            <ul className="space-y-1">
              {ENV_VARS.map((v) => (
                <li key={v} className="flex items-center gap-2 text-xs font-mono text-on-surface">
                  <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                  {v}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-on-surface-variant mt-2">
              Example: META_REDIRECT_URI=https://your-app.vercel.app/api/social/meta/callback
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-outline-variant/30 flex justify-end">
        <Button type="button" onClick={onClose} icon={<BookOpen className="w-4 h-4" />}>
          Got it
        </Button>
      </div>
    </Modal>
  );
}
