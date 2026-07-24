import "dotenv/config";
import { Client } from "pg";

const SQL = `
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

drop policy if exists "product-photos public read" on storage.objects;
create policy "product-photos public read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

drop policy if exists "product-photos org write" on storage.objects;
create policy "product-photos org write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-photos'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()::text
      and (storage.foldername(name))[1] = u."organizationId"
    )
  );

drop policy if exists "product-photos org delete" on storage.objects;
create policy "product-photos org delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-photos'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()::text
      and (storage.foldername(name))[1] = u."organizationId"
    )
  );
`;

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  await client.query(SQL);
  await client.end();
  console.log("Storage bucket 'product-photos' and RLS policies are set up.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
