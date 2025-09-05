insert into departments (name) values ('Brewhouse'),('Taproom'),('Maintenance') on conflict (name) do nothing;
insert into roles (name) values ('Admin'),('Manager'),('Worker') on conflict (name) do nothing;

with t as (
  insert into templates (name, frequency, version, is_active)
  values ('Brewhouse End-of-Day','daily',1,true)
  returning id
), s as (
  insert into sections (template_id, name, sort_order)
  select id, 'Boiler & Steam', 1 from t
  returning id
)
insert into items (section_id, prompt, type, required, sort_order, config) values
((select id from s),'Is kettle steam off?','yesno',true,1,'{}'),
((select id from s),'Boiler blowdown pressure (psi)','number',true,2,'{"min":0,"max":200}'),
((select id from s),'Drain photo uploaded?','select',true,3,'{"options":["Uploaded","N/A"]}');
