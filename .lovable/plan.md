

## Plan: Google OAuth Login + Master Admin (visraeloficial@gmail.com)

### Current State
- No users exist in the database yet
- Login page has email/password + signup form
- `user_roles` table exists with `has_role()` function ready

### 1. Enable Google OAuth
- Use the Lovable Cloud social auth tool to configure Google sign-in
- Update `useAuth.tsx` to add `signInWithGoogle` method using `lovable.auth.signInWithOAuth("google")`

### 2. Auto-assign admin role on first Google login
- Create a database trigger: when a new user signs up with email `visraeloficial@gmail.com`, automatically insert admin role into `user_roles`
- SQL migration: trigger on `auth.users` insert → if email = master email → insert admin role

### 3. Update Login page (`src/pages/Login.tsx`)
- Remove email/password form and signup toggle
- Replace with single "Entrar com Google" button
- Clean, minimal design with Google icon

### 4. Update `useAuth.tsx`
- Add `signInWithGoogle` method using lovable OAuth module
- Keep existing `checkAdmin` logic (already works with `user_roles` table)

### Files to Edit
- `src/pages/Login.tsx` — replace form with Google button
- `src/hooks/useAuth.tsx` — add `signInWithGoogle`
- Migration SQL — trigger to auto-assign admin to master email

