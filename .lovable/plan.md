

## Plan: Add Collaborator + Collaborators Admin Page

### 1. Update auto_assign trigger to include second admin email
- Modify the `auto_assign_master_admin()` function to also assign admin role to `israeljdeoliveira@gmail.com`

### 2. Create Collaborators admin page (`src/pages/admin/CollaboratorsPage.tsx`)
- List all users from `user_roles` joined with `profiles` (email, role)
- Master user (visraeloficial@gmail.com) can add/remove collaborators by email
- Add admin role = insert into `user_roles`, remove = delete from `user_roles`
- Only the master email can manage collaborators (UI-level check; RLS already protects the table)

### 3. Add nav item + route
- Add "Colaboradores" nav item in `AdminLayout.tsx` with `UsersRound` icon
- Add route `/admin/collaborators` in `App.tsx`

### Files to Create
- `src/pages/admin/CollaboratorsPage.tsx`

### Files to Edit
- `src/pages/admin/AdminLayout.tsx` (new nav item)
- `src/App.tsx` (new route)
- Migration SQL (update trigger function + insert admin role for second email)

