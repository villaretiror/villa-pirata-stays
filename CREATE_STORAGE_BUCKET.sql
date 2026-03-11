-- Configurar Storage Bucket para 'contracts'
insert into storage.buckets (id, name, public) values ('contracts', 'contracts', true) on conflict do nothing;

create policy "Allow generic upload for contracts" on storage.objects for insert to public with check (bucket_id = 'contracts');
create policy "Allow generic read for contracts" on storage.objects for select to public using (bucket_id = 'contracts');
