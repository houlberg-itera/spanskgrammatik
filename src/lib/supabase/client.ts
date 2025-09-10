import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
<<<<<<< HEAD
  );
=======
  );
>>>>>>> b7a9fe9a12675191bf20a1adbaf25ba95debfb4c
