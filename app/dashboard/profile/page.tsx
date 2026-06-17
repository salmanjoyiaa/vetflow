import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { getMyProfileAction } from '@/lib/services/profile-actions';
import MyProfileClient from '@/components/forms/MyProfileClient';

export const metadata = {
  title: 'My Profile',
  description: 'Manage your account, photo, and password.',
};

export default async function ProfilePage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const res = await getMyProfileAction();
  if (!res.success) {
    return (
      <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        {res.error}
      </div>
    );
  }

  return (
    <MyProfileClient
      email={res.profile.email}
      firstName={res.profile.firstName}
      lastName={res.profile.lastName}
      phone={res.profile.phone}
      role={res.profile.role}
      photoUrl={res.profile.photoUrl}
    />
  );
}
