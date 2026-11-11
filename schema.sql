-- ISAKA DIGITAL HUB: run in Supabase SQL editor
create table profiles(id uuid primary key references auth.users on delete cascade, email text, full_name text, role text not null default 'customer', created_at timestamptz default now());
create table services(id uuid primary key default gen_random_uuid(), name text not null, department text not null, description text, price_usd numeric(10,2) not null check(price_usd>=0), delivery text, requirements text, active boolean default true);
create table orders(id uuid primary key default gen_random_uuid(), order_code text unique not null, user_id uuid not null references profiles, items jsonb not null, total_usd numeric(10,2) not null, status text not null default 'PENDING PAYMENT' check(status in('PENDING PAYMENT','PAYMENT UNDER REVIEW','PAID','PROCESSING','COMPLETED','CANCELLED','REFUNDED')), delivered_url text, created_at timestamptz default now());
create table payments(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders, user_id uuid not null references profiles, method text default 'MIXX_MANUAL', reference text not null unique, amount_usd numeric(10,2) not null, status text not null default 'UNDER REVIEW' check(status in('UNDER REVIEW','APPROVED','REJECTED','REFUNDED')), created_at timestamptz default now(), reviewed_at timestamptz);
create table support(id uuid primary key default gen_random_uuid(), user_id uuid references profiles, message text not null, created_at timestamptz default now());
create table settings(key text primary key, value text);
create table notifications(id uuid primary key default gen_random_uuid(), user_id uuid references profiles, message text, created_at timestamptz default now());

create function is_owner() returns boolean language sql security definer stable as $$ select exists(select 1 from profiles where id=auth.uid() and role='owner') $$;
create function handle_new_user() returns trigger language plpgsql security definer as $$ begin insert into profiles(id,email,full_name) values(new.id,new.email,new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();

alter table profiles enable row level security; alter table services enable row level security; alter table orders enable row level security;
alter table payments enable row level security; alter table support enable row level security; alter table settings enable row level security; alter table notifications enable row level security;

create policy p_sel on profiles for select using(id=auth.uid() or is_owner());
create policy p_upd on profiles for update using(id=auth.uid());
revoke update on profiles from authenticated; grant update(full_name) on profiles to authenticated; -- customers cannot change role
create policy s_sel on services for select using(active or is_owner());
create policy s_all on services for all using(is_owner()) with check(is_owner());
create policy o_sel on orders for select using(user_id=auth.uid() or is_owner()); -- writes only via Netlify Functions (service role)
create policy pay_sel on payments for select using(user_id=auth.uid() or is_owner());
create policy sup_ins on support for insert with check(user_id=auth.uid());
create policy sup_sel on support for select using(user_id=auth.uid() or is_owner());
create policy set_sel on settings for select using(true);
create policy set_all on settings for all using(is_owner()) with check(is_owner());
create policy n_sel on notifications for select using(user_id=auth.uid());

insert into settings values('mixx_number','0658014204'),('business_name','ISAKA DIGITAL HUB'),('tzs_rate','2600'),('instructions','Open the official Mixx by Yas service on your phone, choose Send Money, enter the number and exact amount, and put your Order ID in the note. Never share your PIN or OTP with anyone.');
insert into services(name,department,description,price_usd,delivery,requirements) values
('Professional CV','ISAKA AI Writing','Polished, ATS-friendly CV.',3,'24 hours','Work history, education, skills'),
('Cover Letter','ISAKA AI Writing','Tailored cover letter.',2,'12 hours','Job ad, your CV'),
('Business Proposal','ISAKA AI Writing','Clear, persuasive proposal.',5,'48 hours','Client, scope, budget'),
('Social Media Design','ISAKA Creative Studio','Branded social graphic.',4,'24 hours','Brand colors, text, logo'),
('Landing Page','ISAKA Website Studio','Responsive one-page site.',15,'3-5 days','Content, logo, goal'),
('Business Starter Pack','ISAKA Business Tools','Invoice, quotation and plan templates.',10,'48 hours','Business name and details');
-- After you sign up, make yourself owner: update profiles set role='owner' where email='YOUR_EMAIL';
