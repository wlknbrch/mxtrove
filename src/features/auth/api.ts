import { requireSupabase } from "@/lib/service-utils";

export async function signInWithPassword(input: { email: string; password: string }) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword(input);

  if (error) {
    throw error;
  }
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const client = requireSupabase();
  const { error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName,
      },
    },
  });

  if (error) {
    throw error;
  }
}
