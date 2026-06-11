"use client";

import { useUser as useClerkUser, useClerk } from "@clerk/nextjs";

interface ShimUser {
  email?: string;
  user_metadata: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface UseUserReturn {
  user: ShimUser | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const { isLoaded, isSignedIn, user } = useClerkUser();
  const { signOut: clerkSignOut } = useClerk();

  const shimUser: ShimUser | null =
    isSignedIn && user
      ? {
          email: user.primaryEmailAddress?.emailAddress,
          user_metadata: {
            full_name: user.fullName ?? undefined,
            first_name: user.firstName ?? undefined,
            last_name: user.lastName ?? undefined,
          },
        }
      : null;

  const signOut = async () => {
    await clerkSignOut({ redirectUrl: "/login" });
  };

  return {
    user: shimUser,
    loading: !isLoaded,
    error: null,
    signOut,
  };
}
