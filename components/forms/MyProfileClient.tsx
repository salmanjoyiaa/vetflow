'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  changeMyPasswordAction,
  updateMyProfileAction,
  uploadMyAvatarAction,
} from '@/lib/services/profile-actions';
import PageHeader from '@/components/ui/premium/PageHeader';
import { Camera, Loader2, Lock, User, CheckCircle } from 'lucide-react';

interface MyProfileClientProps {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string | null;
  photoUrl: string | null;
}

function formatRole(role: string | null): string {
  switch (role) {
    case 'clinic_admin':
      return 'Clinic Admin';
    case 'doctor':
      return 'Doctor';
    case 'receptionist':
      return 'Receptionist';
    default:
      return 'Staff';
  }
}

export default function MyProfileClient({
  email,
  firstName: initialFirst,
  lastName: initialLast,
  phone: initialPhone,
  role,
  photoUrl: initialPhoto,
}: MyProfileClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [phone, setPhone] = useState(initialPhone);
  const [photoUrl, setPhotoUrl] = useState(initialPhoto);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);
    const res = await updateMyProfileAction({ firstName, lastName, phone });
    if (res.success) {
      setProfileMsg('Profile updated.');
      router.refresh();
    } else {
      setProfileErr(res.error || 'Failed to update profile.');
    }
    setSavingProfile(false);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setProfileErr(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await uploadMyAvatarAction(fd);
    if (res.success && res.photoUrl) {
      setPhotoUrl(res.photoUrl);
      setProfileMsg('Photo updated.');
      router.refresh();
    } else {
      setProfileErr(res.error || 'Failed to upload photo.');
    }
    setUploadingPhoto(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg(null);
    setPasswordErr(null);
    const res = await changeMyPasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (res.success) {
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordErr(res.error || 'Failed to change password.');
    }
    setSavingPassword(false);
  };

  const initial = (firstName?.charAt(0) || email?.charAt(0) || 'U').toUpperCase();

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title="My profile"
        description="Manage your account details, photo, and password."
        icon={User}
      />

      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-primary/15 flex items-center justify-center text-2xl font-black text-primary border border-outline-variant/30">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary text-white shadow-lg hover:opacity-90 disabled:opacity-60"
              title="Upload photo"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-lg font-black text-on-surface">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-on-surface-variant">{email}</p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1">
              {formatRole(role)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 border-t border-outline-variant/30 pt-6">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Personal details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
                First name
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
                Last name
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
              required
            />
          </div>
          {profileErr && (
            <p className="text-xs text-destructive">{profileErr}</p>
          )}
          {profileMsg && (
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {profileMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
          >
            {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
            Save profile
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Change password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>
          {passwordErr && <p className="text-xs text-destructive">{passwordErr}</p>}
          {passwordMsg && (
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {passwordMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className="border border-primary/40 text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/10 disabled:opacity-60 flex items-center gap-2"
          >
            {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
